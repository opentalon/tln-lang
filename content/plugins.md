---
title: "Plugins"
description: "Tln's core is transport-free — every edge is a plugin: tools (tln-mcp), I/O (tln-io), storage (tln-db), solver (tln-asp), and a Prolog runtime (tln-prolog)."
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
    tool "inventory" "create-refill-order" { item_id item.id quantity 5 }
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
  endpoint env "INVENTORY_ENDPOINT"
  bearer   env "INVENTORY_TOKEN"
}
```

`collect` / `enrich` / `remediate` dispatch through the same resolver. See
[MCP & workflows](/beyond-prolog/mcp-workflows/) for more.

## I/O — `tln-io`

Not every tool call goes to a remote server. Tln core is **effect-free**: it decides *which*
effects fire and hands them back as data; performing them is a plugin's job.
[`tln-io`](https://github.com/opentalon/tln-io) is the plugin for the most basic effect — I/O —
injected exactly like `tln-mcp`. You call the `io` server like any other tool:

```tln
detect "Overdue for service" {
  for records where type == "vehicle"
    and attr "km" > attr "last_service_km" + 20000
  flag matching items
  remediate {
    tool "io" "writeln" { text "overdue: {item.id} at {attr.km} km" }
    if attr "priority" == "CRITICAL" {
      tool "io" "eprintln" { text "CRITICAL: {item.id}" }
    }
  }
}
```

The tools are `write`/`writeln` (and `print`/`println`), `write_err`/`eprintln`, `format`
(printf-style), and `read`/`read_line` (which binds the line back as a value). A `connector` picks
the destination — the **name you call** is the connector:

```tln
connector "io"    via io { }                               # stdout (default)
connector "errs"  via io { stream stderr }                 # stderr
connector "audit" via io { path "/var/log/tln/audit.log" } # append to a file

tool "audit" "writeln" { text "overdue: {item.id}" }       # → the file
```

`io` needs no credentials (`env "…"` is an `mcp` concern); the runtime opens the file/stream and
hands the plugin the writer/reader — no paths in the rule.

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
                     tln-db   tln-mcp · tln-io  tln-asp
```

## Two ways to run — standalone or hosted

Because the core is transport-free, the same `.tln` program runs in two modes, resolved by a fixed
precedence: **host binding → `connector` block → built-in `io` → error**.

- **Standalone.** The program declares its own `connector` blocks — with `env` for endpoints and
  credentials — so it runs with **no Go host**. `tln run` wires the plugins the source names, and
  the built-in `io` server needs no declaration:

  ```tln
  connector "inventory" via mcp {
    endpoint env "INVENTORY_ENDPOINT"
    bearer   env "INVENTORY_TOKEN"
  }

  detect "Overdue" {
    for records where type == "vehicle" and attr "km" > attr "service_due_km"
    flag matching items
    remediate {
      tool "inventory" "create-refill-order" { item_id item.id quantity 5 }
      tool "io" "writeln" { text "reordered {item.id}" }
    }
  }
  ```

- **Hosted** (e.g. **[OpenTalon](/opentalon/)**). A Go host binds the plugins itself
  (`tln.WithToolResolver(…)`), and that binding **wins** — the same rules run unchanged, with the
  host owning endpoints, credentials, and I/O. For LLM-authored source the host sandboxes it: `env`
  is cut and `io` restricted, so a generated program can't reach secrets or the filesystem.

Two guardrails make this safe: `env` is **connector-scoped** (it parses *only* inside a connector's
config — never in a `label`, a stored fact, or a `tool` argument, so a credential can't leak into
data), and `connector`/`env` are **author-only** (a metaprogramming macro may emit `tool` calls but
never a connector).

## Prolog runtime — `tln-prolog`

One more plugin is aimed squarely at the migration story:
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
