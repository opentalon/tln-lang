---
title: "Derived predicates & recursion"
weight: 2
description: "Deductive chains and negation-through-recursion — where Tln stays close to Prolog, and where it goes further."
---

This is the comparison closest to Prolog's heart: **derived predicates** and **recursive rules**.
Tln keeps the Datalog surface Prolog programmers already know — and fixes the one place ISO
Prolog's negation quietly breaks.

## Derived predicates

A `derive` block names a boolean predicate over a record; any other block references it as
`pred(v)`, exactly like an asserted fact. It's the same idea as a Prolog rule head — but the
planner *inlines* it, and the blocks that use it stay declarative (`flag` / `label` instead of a
`forall`/`format` loop). Both programs below are real: the Prolog is ISO-standard and
SWI-checked, the Tln is [`examples/vehicle_recall.tln`](https://github.com/opentalon/tln-language/blob/master/examples/vehicle_recall.tln).

{{< compare >}}
{{< pane title="ISO Prolog (1995)" lang="prolog" >}}
% "overdue" is a derived predicate — a rule head.
overdue(E, Id) :-
    record(E, Id, vehicle, _, _, _),
    attr(E, Id, km, Km),
    attr(E, Id, last_service_km, Last),
    Km > Last + 20000.

recall_candidate(E, Id) :-
    overdue(E, Id),
    attr(E, Id, model, Model),
    member(Model, ['Transit', 'Sprinter']).

% Chaining is natural; flagging + labelling is manual.
report_recalls(E) :-
    forall(recall_candidate(E, Id),
           ( attr(E, Id, name, Name),
             attr(E, Id, model, Model),
             format("~w: recall candidate (model ~w)~n",
                    [Name, Model]) )).
{{< /pane >}}
{{< pane title="Tln" lang="tln" >}}
derive overdue(v) {
  for records where type == "vehicle"
    and attr "km" > attr "last_service_km" + 20000
}

detect "Recall candidates" {
  for records where overdue(v)
    and attr "model" in ["Transit", "Sprinter"]
  flag matching items
  label "{item.name}: recall candidate ({attr.km} km, model {attr.model})"
}

recommend "Book recall service" {
  when detect "Recall candidates" matches
  suggest "book {item.name} in for the recall service"
}
{{< /pane >}}
{{< /compare >}}

Same deduction, but the Tln chain `derive → detect → recommend` runs end-to-end with no host
glue, and `tln explain` will name the derived predicate in its trace:

```text
WHY
  • satisfies derived overdue(v)
```

## Negation through recursion

Here's where the standard bites. The canonical logic-programming example is the game of
positions — *a position is winning if some move leads to a non-winning position*:

```prolog
win(X) :- move(X, Y), \+ win(Y).
```

On a graph like `a → b` with `b` terminal, this is fine: `win(b)` is false, `win(a)` is true.
But add a **draw** — a 2-cycle `a ⇄ b` — and ISO Prolog's negation-as-failure (SLDNF) has no
sound answer: the goal recurses through `\+ win(Y)` into itself and **loops**.

Tln's recursive resolver takes the negative literal and computes the rule set's **well-founded
model** — a unique three-valued interpretation where every atom is *true*, *false*, or
*undefined*:

| graph | Tln result |
|---|---|
| `a → b`, `b` terminal | `win(a)` **true**, `win(b)` **false** |
| `a ⇄ b` (a draw) | `win(a)`, `win(b)` both **undefined** |

The draw is exactly where well-founded semantics earns its keep: instead of looping or guessing,
Tln says *undefined* and means it. (Recursive/negated rules currently live at the engine level —
see [`docs/well-founded.md`](https://github.com/opentalon/tln-language/blob/master/docs/well-founded.md);
a `.tln` surface syntax rides with self-hosting.)

## Bounded recursion with guards

Real recursive Prolog leans on arithmetic — but usually as **guards**, not term construction:
"reachable within N hops", "follow edges while the running weight stays under a cap", "walk only
nodes whose name starts with…". Tln's recursive resolver evaluates comparison (`< <= > >= !=`),
string (`starts_with` / `contains` / …), and membership (`in` / `not_in`) predicates as **guards**
inside a recursive rule body — on both the top-down and well-founded resolvers.

A guard only *filters* already-bound values; it binds no fresh variable and invents nothing outside
the facts, so the fixpoint still terminates. That moves **bounded reachability, threshold/weight
walks, and string-filtered recursion** from engine-only to native, terminating Tln rules.

What stays on [`tln-prolog`](/plugins/#prolog-runtime--tln-prolog): **value-inventing** arithmetic
— e.g. `N1 is N - 1` fed back into the recursion — which builds new values and would break the
finite-model guarantee.

## Takeaway

For everyday deduction Tln stays deliberately close to Prolog — you're writing rule heads and
bodies. The differences are downstream: derivations inline into declarative `detect`/`recommend`
blocks, results are testable and explainable, and recursion-with-negation gets a defined answer
instead of an infinite loop.
