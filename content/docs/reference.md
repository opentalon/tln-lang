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

Beyond these core blocks, Tln adds **ML** (`predict`, `forecast`, `classify`, `cluster`, `find`),
**MCP orchestration** (`workflow`, `on`, `collect`, `enrich`), reactive `on change` blocks, and
integrity `constraint`s — all in **[Beyond Prolog](/beyond-prolog/)**.
