---
title: "Tln — The Modern Expert-System Language"
description: "Modernize Prolog expert systems into a deterministic, testable, data-native rule platform."
---

# [Tln](https://github.com/opentalon/tln-language) — The Modern Expert-System Language

**Tln modernizes Prolog expert systems** into a deterministic, testable, data-native rule
platform. Domain experts write rules that read like English; a native Go engine plans and
evaluates them over your live data — with built-in **ML primitives**, first-class **MCP tool
orchestration**, and a **`.tln.test`** framework.

Prolog — standardized as **ISO/IEC 13211-1 in 1995** — pioneered expert systems. Tln keeps the
idea (facts, rules, inference) and modernizes everything around it: no `assert/retract`
spaghetti, no hand-rolled query-and-format plumbing, no "trust me, it works." Same logic, modern
platform.

[Get started →](/docs/getting-started/) · [Prolog → Tln →](/comparisons/) · [Beyond Prolog →](/beyond-prolog/)

---

## Same rule, modernized

A fleet-maintenance check: *flag active vehicles overdue for service.* Left, standard ISO Prolog;
right, the same decision in Tln.

{{< compare >}}
{{< pane title="ISO Prolog (1995)" lang="prolog" >}}
% Facts arrive from external systems as generic triples:
%   record(Entity, Id, Type, Category, Status, Date).
%   attr(Entity, Id, Name, Value).

active_vehicle(E, Id) :-
    record(E, Id, item, 'Vehicles', active, _).

service_overdue(E, Id) :-
    active_vehicle(E, Id),
    attr(E, Id, km, Km),
    attr(E, Id, last_service_km, Last),
    Km > Last + 20000.

% "Flag matching items with a label" is on you: query, collect, format.
report_overdue(E) :-
    forall(service_overdue(E, Id),
           ( attr(E, Id, name, Name),
             attr(E, Id, km, Km),
             format("~w: ~w km since last service~n", [Name, Km]) )).
{{< /pane >}}
{{< pane title="Tln" lang="tln" >}}
// Facts arrive from external systems as generic triples:
//   record(Entity, Id, Type, Category, Status, Date)
//   attr(Entity, Id, Name, Value)

define "active_vehicle" {
  type == "item"
  and status == "active"
  and category == "Vehicles"
}

detect "Service overdue" {
  for records where is "active_vehicle"
    and attr "km" > attr "last_service_km" + 20000
  flag matching items
  label "{item.name}: {attr.km} km since last service"
}
{{< /pane >}}
{{< /compare >}}

The Tln version *declares the outcome* — flag, label — instead of scripting the query
and the print loop. It compiles to a deterministic query plan, is unit-testable with `.tln.test`,
and the same `detect` block can escalate straight into an MCP workflow.

---

## Beyond Prolog

Things classic Prolog has no native answer for:

- **[MCP tool orchestration](/beyond-prolog/mcp-workflows/)** — `workflow`, reactive
  `on change → workflow`, scheduled `collect`, and stale-fact `enrich`, all calling real tools.
- **[Built-in ML](/beyond-prolog/ml/)** — `predict`, `forecast`, `classify`, `cluster`,
  `find similar` — 11 explainable primitives, no external pipeline.
- **[A real test framework](/beyond-prolog/testing/)** — `.tln.test` with `given` / `when` /
  `expect`, so rules are verified, not hoped.

And in production it's the decision core of **[OpenTalon](/opentalon/)**, the enterprise
AI-orchestration ecosystem: the LLM handles intent, Tln handles knowledge and inference.
