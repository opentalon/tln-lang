---
title: "Language Reference"
weight: 2
description: "Core blocks, values, operators, selectors, templates, and priorities."
---

Facts are loaded from external systems (see [the mental model](/docs/getting-started/#the-mental-model));
`.tln` files contain **blocks** that reason over them.

## Values

```tln
42            3.14                 // numbers
"outpatient"                       // strings — always double-quoted
true          false                // booleans
7 days   30 days   12 months   1 year   // durations
["health", "cancellation"]   [100, 200]  // lists
```

## Operators

```text
>  <  >=  <=  ==  !=  ~=        // comparison
+  -  *  /  %                   // arithmetic
and  or  not                   // logical
in [ … ]      not in [ … ]      // membership
contains   starts_with   ends_with   older_than   newer_than   // string / temporal
```

## Selectors

A selector picks which records a block runs over:

```tln
for records where type == "product"
  and category == "van"
  and attr "price" > 100
  and status == "active"
  and is "high_value"          // reference a define
```

## Core blocks

### `define` — reusable conditions

```tln
define "high_value" {
  attr "amount_chf" > 10000
}
```

### `rule` — enforce a constraint (`allow` / `block`)

```tln
rule "Reject blacklisted provider" {
  for records where type == "claim"
    and attr "provider_status" == "blacklisted"
  block "approve_claim"
  reason "Provider {attr.provider_id} is on the fraud blacklist"
}
```

Swap `block` for `allow` to auto-approve. Higher `priority` wins conflicts; a `strict` rule is
non-negotiable and an `overrides "Other rule"` rule defeats a named one.

### `detect` — find patterns and flag them

```tln
detect "Over the per-visit cap" {
  for records where type == "claim"
    and attr "amount_chf" > attr "per_visit_cap"
  flag matching items
  label "Claim {item.id}: {attr.amount_chf} CHF over cap"
}
```

### `recommend` — suggest the next step

```tln
recommend "Schedule reviewer" {
  when detect "Over the per-visit cap" matches
  suggest "Route claim {item.id} to a senior adjuster"
}
```

### `combine` — optimal combinations

```tln
combine "Reorder picks" {
  for records where type == "stock_item" and status == "active"
  select 3 from records
  minimize total(attr "reorder_cost")
  subject_to total(attr "reorder_cost") <= 5000
  return id, reorder_cost
}
```

`combine` runs real multi-objective optimization (Pareto / genetic / ant-colony / ILP backends);
add more `minimize` / `maximize` objectives and `subject_to` constraints as needed.

## Templates

`label`, `reason`, and `suggest` strings interpolate `{…}`:

```text
{attr.<name>}          a record's attribute        {item.name}   the matched item
{count}                number of matches            {item.id}     the matched id
{total(attr.<name>)}   sum over matches             {avg(attr.<name>)}
{days_until(<date>)}   days until a date            {days_since(<date>)}
```

## Priorities

```text
CRITICAL   immediate action        HIGH   within days
MEDIUM     within weeks            LOW    informational
```

## Metaprogramming — compile-time macros

> Metaprogramming is a **core** feature (merged to `master`): the macro-expansion phase runs inside
> the compiler, between import resolution and validation. The grammar shown here is the design
> ([ADR 0011](https://github.com/opentalon/tln-language/blob/master/docs/design/0011-compile-time-macros.md));
> the phase currently ships as an identity transform while the rewrite engine is filled in.

Tln does metaprogramming the **Elixir way**: macros are code that writes code, and they run at
**compile time**. A `defmacro` expands into ordinary blocks *before* validation and planning — so
the validator, planner, and runtime never see a macro, and the engine stays exactly as
deterministic and terminating as always. The one place unbounded computation is allowed is
expansion itself, bounded by a step budget (a compile error, never a runtime hang). That's also
why macros live **in core, not a plugin**: only core owns the grammar and the compile phases.

`quote` turns a block into an AST value, `unquote` splices a value in, and `defmacro` is a
compile-time function from arguments to AST. Here a single macro kills the boilerplate across
near-identical `detect` rules — and, since Prolog is homoiconic, it *is* expressible in Prolog too,
via the classic `term_expansion/2` hook:

{{< compare >}}
{{< pane title="ISO Prolog (1995)" lang="prolog" >}}
% Compile-time metaprogramming via term_expansion/2:
% each over_threshold/3 fact is rewritten, as it is read,
% into a high/1 rule.
term_expansion(over_threshold(Name, Metric, Limit),
               ( high(Item) :-
                    record(_, Item, item, _, _, _),
                    attr(_, Item, Metric, V),
                    V > Limit )).

over_threshold(temperature, temp_c, 80).
over_threshold(pressure,    psi,   200).
{{< /pane >}}
{{< pane title="Tln" lang="tln" >}}
defmacro over_threshold(name, metric, limit, prio) {
  quote {
    detect "High {unquote(name)}" {
      for records where type == "item"
        and attr unquote(metric) > unquote(limit)
      flag matching items
      label "{item.name}: high {unquote(name)}"
      priority unquote(prio)
    }
  }
}

over_threshold("temperature", "temp_c", 80, HIGH)
over_threshold("pressure",    "psi",   200, MEDIUM)
{{< /pane >}}
{{< /compare >}}

Both generate two rules from one definition. The difference is *what* they rewrite and *when*:
Prolog's `term_expansion` (and its runtime cousins `=..`, `call`, `assert`) operate on **Prolog
terms** — function symbols that flat-EAV Tln core doesn't have, so that runtime "code-as-data"
belongs to the [`tln-prolog`](/plugins/) engine. Tln's macros instead expand to **AST blocks** at
compile time, leaving the runtime a pure, deterministic Datalog. The Tln macro above expands into
exactly two ordinary `detect` blocks:

```tln
detect "High temperature" {
  for records where type == "item" and attr "temp_c" > 80
  flag matching items
  label "{item.name}: high temperature"
  priority HIGH
}
detect "High pressure" {
  for records where type == "item" and attr "psi" > 200
  flag matching items
  label "{item.name}: high pressure"
  priority MEDIUM
}
```

## Priorities and beyond

Beyond these core blocks, Tln adds **ML** (`predict`, `forecast`, `classify`, `cluster`, `find`),
**MCP orchestration** (`workflow`, `on`, `collect`, `enrich`), reactive `on change` blocks, and
integrity `constraint`s — all in **[Beyond Prolog](/beyond-prolog/)**.
