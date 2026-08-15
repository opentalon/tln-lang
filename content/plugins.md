---
title: "Plugins"
description: "Tln's core is transport-free — every edge is a plugin: tools (tln-mcp), I/O (io-tln), storage (tln-db), solver (tln-asp), and a Prolog runtime (tln-prolog)."
---

Tln's language core is a **pure language + planner**: it decides *which* facts to read, *which*
tool calls to fire, and *which* rules to run — and returns them as **data**. It performs no IO and
no non-deterministic search itself. Every edge — storage, tools, solvers, channels — is a
**plugin** injected by the host. That's what keeps the core deterministic and testable, and the
system extensible.

## Tools — the `tool` verb

A block calls a tool with the plugin-neutral **`tool`** verb — `tool "server" "name" { … }`. The
server name routes to a host-injected `ToolResolver`; nothing about the transport is baked into the
rule:

```tln
workflow "Notify low stock" {
  step "reorder" {
    tool "inventory" "create-refill-order" { item_id item.id quantity 50 }
  }
  step "announce" {
    tool "slack" "post-message" { channel "#ops" text "reordered {item.id}" }
  }
}
```

[`tln-mcp`](https://github.com/opentalon/tln-mcp) is the ready-made resolver that routes such
server names over the **Model Context Protocol** (JSON-RPC); a mock, a direct HTTP client, or an
internal bus can stand in without touching a rule. A `connector` block binds a server to a plugin
*in source*, with env-resolved credentials — so a program runs with no Go host:

```tln
connector "inventory" via mcp {
  endpoint env "INVENTORY_MCP_URL"
  auth bearer env "INVENTORY_TOKEN"
}
```

`collect` / `enrich` / `remediate` dispatch through the same resolver. See
[MCP & workflows](/beyond-prolog/mcp-workflows/) for more.

## I/O — `io-tln`

Not every tool call goes to a remote server. [`io-tln`](https://github.com/opentalon/io-tln) is a
`ToolResolver` for plain **I/O** — write, print, read — injected exactly like `tln-mcp`. It's the
standalone default: a host owns its own I/O, so the `io` server needs no binding to work.

```tln
detect "Overdue for service" {
  for records where type == "vehicle"
    and attr "km" > attr "last_service_km" + 20000
  flag matching items
  remediate {
    tool "io" "writeln" { text "overdue: {item.id}" }
  }
}
```

A `connector "…" via io { path … | stream … }` points the sink at a file or stdout/stderr; the
runtime opens it and hands the plugin a writer/reader — no paths or secrets in the rule.

## Storage — `tln-db`

The other SPI is the `FactStore`. [`tln-db`](/db/) is the Go-native fact store behind it — embed it
as a library or run it as a gRPC/HTTP sidecar. The same interface accepts other backends
(in-memory for tests, Datalevin, …). Details on the **[DB](/db/)** page.

## Solver — `tln-asp`

Tln core is deterministic: its well-founded resolver yields a **single** three-valued model
(true / false / undefined). But some problems — planning, configuration, combinatorial search —
have **zero or many** solutions. That's **Answer Set Programming** (stable-model semantics), kept
out of core by design and owned by the [`tln-asp`](https://github.com/opentalon/tln-asp) plugin: a
pure-Go stable-model solver.

The classic example: a position is *winning* if some move leads to a position that is **not**
winning — `win` defined through its own negation.

{{< compare >}}
{{< pane title="ISO Prolog (1995)" lang="prolog" >}}
% Recursion through negation. Under SLDNF this loops on a
% cycle (a draw) — the rule set has no single model.
win(X) :- move(X, Y), \+ win(Y).

move(a, b).
{{< /pane >}}
{{< pane title="Tln + tln-asp" lang="tln" >}}
// Written the same way. Tln core rejects negation-through-
// recursion as "not stratifiable", so the tln-asp plugin
// solves it and enumerates the answer sets.
derive win(x) {
  for records where move(x, y) and not win(y)
}

detect "Winning positions" {
  for records where type == "position" and win(pos)
  flag matching items
  label "{item.name}: winning"
}
{{< /pane >}}
{{< /compare >}}

On a cycle (a draw) the rule has **multiple answer sets** — *undefined* for core's single
well-founded model, but exactly the ASP case. The host builds the rule set from the public
`pkg/factstore` types and hands it to `tln-asp`, which enumerates the answer sets; each feeds back
into any FactStore.

## The pattern

```text
                 ┌────────────────────────────┐
   facts  ─────► │  Tln core: parse → plan →   │ ─────► tool calls (as data)
                 │  evaluate  (deterministic)  │
                 └──────┬─────────┬─────────┬──┘
                        │ SPI     │ SPI     │ SPI
                   FactStore    ToolResolver    Solver
                     tln-db   tln-mcp · io-tln  tln-asp
```

## Prolog runtime — `tln-prolog`

The fourth plugin is aimed squarely at the migration story:
[`tln-prolog`](https://github.com/opentalon/tln-prolog) is a **pure-Go Prolog engine** — so a
Prolog program can run in the Tln world with **no Prolog installed** (no SWI, no GNU).

Porting is the point: Prolog is the source, Tln is the target. The **relational subset** of a `.pl`
file lowers to native Tln rules on the core engine — including recursive rules whose arithmetic is
just a **guard** (comparisons, string tests, membership: bounded reachability, threshold/weight
walks). But core is flat-EAV / Datalog with no function symbols, so Prolog's compound terms and
lists, cut-dependent control, `assert`/`retract`, and **value-inventing** arithmetic (`N1 is N-1`
fed back into recursion) **can't** become core rules. Those parts run on `tln-prolog` instead —
same ecosystem, still no external Prolog:

```prolog
% Lists + compound terms — no flat-EAV / Datalog equivalent,
% so this keeps running on the tln-prolog engine, unchanged.
conc([], L, L).
conc([H|T], L, [H|R]) :- conc(T, L, R).
```

It carries what core deliberately lacks: structured terms (`Var · Atom · Int · Compound`),
unification with a sound occurs-check, a depth-bounded SLD machine (backtracking, fresh-clause
renaming), and an ISO-subset `.pl` reader that **never drops anything silently** — unsupported
constructs come back as typed diagnostics. Answers project to `[]factstore.Fact`, so results flow
into any Tln FactStore.

So the [Prolog → Tln](/comparisons/) comparisons aren't only "rewrite by hand": existing Prolog
can be **ported** — the relational parts become Tln rules, the rest keeps running on `tln-prolog`.
