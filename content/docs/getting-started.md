---
title: "Getting Started"
weight: 1
description: "Your first Tln rule, the mental model, and the CLI."
---

## Hello, World

The smallest useful Tln program finds something in your data and flags it. Here we flag any
`greeting` record and greet it by name — Prolog on the left, Tln on the right:

{{< compare >}}
{{< pane title="ISO Prolog (1995)" lang="prolog" >}}
% Facts loaded externally; shown here as plain facts:
greeting(1, 'World').

hello(Id) :-
    greeting(Id, Name),
    format("Hello, ~w!~n", [Name]).
{{< /pane >}}
{{< pane title="Tln" lang="tln" >}}
detect "Hello, World" {
  for records where type == "greeting"
  flag matching items
  label "Hello, {attr.name}!"
}
{{< /pane >}}
{{< /compare >}}

Line by line:

- `detect "Hello, World"` — a **block**. `detect` finds records matching a condition and flags them.
- `for records where type == "greeting"` — the **selector**: which records this block runs over.
- `flag matching items` — flag every record that matched.
- `label "Hello, {attr.name}!"` — a **template**; `{attr.name}` interpolates that record's `name`.

Optional clauses like `priority LOW|MEDIUM|HIGH|CRITICAL` can tune how loudly a result is
surfaced, but they aren't required.

### Test it

Tln has a built-in test framework. Facts live in a `given` block, and you assert on the result:

```tln
test "greets the world" {
  given {
    record 1 type "greeting"
    attr 1 "name" "World"
  }
  when detect "Hello, World"
  expect {
    flagged 1
    label contains "Hello, World!"
    count == 1
  }
}
```

Run it:

```bash
tln test hello.tln hello.tln.test
# ==> hello.tln.test: 1 test(s)
#
# 1 passed, 0 failed
```

## The other classic: family trees

Every Prolog tutorial has the family tree — a handful of facts and a recursive `ancestor`. Tln
splits this the way production systems already do: **the `parent` relation is data** (loaded as
facts, never written in `.tln`) and the **derivations are rules**:

{{< compare >}}
{{< pane title="ISO Prolog (1995)" lang="prolog" >}}
parent(tom, bob).
parent(bob, ann).

grandparent(X, Z) :- parent(X, Y), parent(Y, Z).

ancestor(X, Z) :- parent(X, Z).
ancestor(X, Z) :- parent(X, Y), ancestor(Y, Z).
{{< /pane >}}
{{< pane title="Tln" lang="tln" >}}
// facts:  record(family, "bob", person, ...)
//         attr(family, "bob", "parent", "tom")

detect "Children of Tom" {
  for records where type == "person"
    and attr "parent" == "tom"
  flag matching items
  label "{item.name} is a child of Tom"
}
{{< /pane >}}
{{< /compare >}}

One-hop relationships are ordinary blocks. The transitive `ancestor` closure — a recursive rule — runs on Tln's recursive Datalog resolver
(the same machinery behind the built-in `category_tree`) and terminates even on cyclic graphs.
See **[Derived predicates & recursion](/comparisons/reasoning-recursion/)**.

## The mental model

**Facts are your data — and you never write them in `.tln`.** They are loaded from your existing
systems (ERP, CRM, asset management, a warehouse DB, MCP tools…) as generic entity–attribute
records:

```text
record(Entity, Id, Type, Category, Status, Date)   // the thing
attr(Entity, Id, Name, Value)                        // a property of the thing
```

**Rules are your knowledge.** You write blocks that reason over those facts:

| Block | Answers |
|-------|---------|
| `define` | a reusable named condition |
| `rule` | "Is this allowed?" (`allow` / `block`) |
| `detect` | "What pattern exists?" (flag + label) |
| `recommend` | "What should we do next?" |
| `combine` | "What's the optimal mix?" |
| `predict` `forecast` `classify` `cluster` `find` | built-in ML — see [Beyond Prolog](/beyond-prolog/ml/) |
| `workflow` `on` `collect` `enrich` | act on the world via MCP — see [MCP & workflows](/beyond-prolog/mcp-workflows/) |

**The engine is native Go.** Tln does *not* interpret rules ad-hoc: a lexer → parser → validator
→ **planner** turns each block into a deterministic query plan (`[]PlanStep`) that an executor
runs against a pluggable `FactStore`. Same facts in, same decision out — every time, and every
decision traces back to the exact rule that fired.

This is **Expert-in-the-Loop**: instead of a human (or an LLM) re-deciding every case, a
deterministic expert system decides, and people are reserved for the rare case that truly needs
them. In production that engine is the decision core of **[OpenTalon](/opentalon/)** — the LLM
handles intent and language, Tln handles knowledge and inference.

## The CLI

```bash
tln build  rules.tln          # parse, validate, and show the query plan
tln test   rules.tln t.tln.test   # run .tln.test assertions
tln run    rules.tln --seed t.tln.test   # evaluate against a FactStore
tln explain rules.tln t.tln.test  # trace why each result fired
tln repl                       # interactive: :load, :eval, :trace
```

Next: the **[Language Reference](/docs/reference/)**, or see Tln beside the language it
modernizes in **[Prolog → Tln](/comparisons/)**.
