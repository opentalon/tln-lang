---
title: "Metaprogramming"
weight: 4
description: "Compile-time macros — code that writes rules, the Elixir way — built into Tln core."
---

Tln does metaprogramming the **Elixir way**: macros are code that writes code, and they run at
**compile time**. A `defmacro` expands into ordinary blocks *before* validation and planning — so
the validator, planner, and runtime never see a macro, and the engine stays exactly as
deterministic and terminating as always. The one place unbounded computation is allowed is
expansion itself, bounded by a step budget (a compile error, never a runtime hang). That's also
why macros live **in core, not a plugin**: only core owns the grammar and the compile phases.

Prolog *can* metaprogram too — it's homoiconic — via the classic `term_expansion/2` hook (and its
runtime cousins `=..`, `call`, `assert`). So this is less "Prolog can't" than "Tln does it
differently": `quote` turns a block into an AST value, `unquote` splices a value in, and `defmacro`
is a compile-time function from arguments to AST. Here one macro kills the boilerplate across
near-identical `detect` rules:

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

The difference is *what* they rewrite and *when*. Prolog's `term_expansion` (and `=..` / `call`)
operate on **Prolog terms** — function symbols that flat-EAV Tln core doesn't have, so that runtime
"code-as-data" belongs to the [`tln-prolog`](/plugins/) engine. Tln's macros expand to **AST
blocks** at compile time, leaving the runtime a pure, deterministic Datalog. The macro above
expands into exactly two ordinary `detect` blocks — all the validator, planner, and runtime ever
see:

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
