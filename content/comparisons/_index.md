---
title: "Prolog → Tln"
description: "The same expert-system logic, modernized."
---

Prolog invented logic programming and powered a generation of expert systems. Its ideas — facts,
rules, backward-chaining inference — are timeless, and it has been a stable ISO standard
(**ISO/IEC 13211-1**) since **1995**. Its *ergonomics* are another matter: you hand-roll the
query-and-format plumbing, conflict resolution is manual, side effects mean `assert`/`retract`,
and there's no built-in way to test a ruleset, learn a threshold, or call an external tool.

Tln keeps the logic and modernizes everything around it. These pages put the two side by side
using real programs from the Tln examples. The
Prolog is idiomatic **ISO Prolog (ISO/IEC 13211-1:1995 or later)**, syntax-checked with
SWI-Prolog; the Tln is the actual `.tln` source, validated with the `tln` compiler.

Both reason over the same external facts, loaded as generic triples:

```text
record(Entity, Id, Type, Category, Status, Date)
attr(Entity, Id, Name, Value)
```

Take the classic family tree. In Prolog you write the facts, the rules, *and* the query-and-print
plumbing to use them. In Tln the `parent` links arrive as facts from your systems — never written
in `.tln` — so a relationship is just a rule that declares its own output:

{{< compare >}}
{{< pane title="ISO Prolog (1995)" lang="prolog" >}}
% facts, rules, AND the query-and-print plumbing:
parent(tom, bob).
parent(bob, ann).
parent(bob, pat).

grandparent(X, Z) :- parent(X, Y), parent(Y, Z).

ancestor(X, Z) :- parent(X, Z).
ancestor(X, Z) :- parent(X, Y), ancestor(Y, Z).

list_children(P) :-
    forall(parent(P, C),
           format("~w~n", [C])).
{{< /pane >}}
{{< pane title="Tln" lang="tln" >}}
// Facts arrive from your systems as record/attr triples
// (loaded, never written in .tln):
//   record(family, "bob", person)   attr(family, "bob", "parent", "tom")
//   record(family, "ann", person)   attr(family, "ann", "parent", "bob")
//   record(family, "pat", person)   attr(family, "pat", "parent", "bob")

detect "Children of Tom" {
  for records where type == "person"
    and attr "parent" == "tom"
  flag matching items
  label "{item.name} is a child of Tom"
}
{{< /pane >}}
{{< /compare >}}

Fewer moving parts, and the outcome is declared rather than scripted. Explore the full worked
comparisons below.

And it isn't only rewrite-by-hand: existing Prolog can be **ported**. The relational subset lowers
to native Tln rules — even recursive ones with comparison/threshold **guards** — while the
genuinely Prolog-only parts (compound terms, cut, `assert`, value-inventing arithmetic) keep
running on the pure-Go [`tln-prolog`](/plugins/#prolog-runtime--tln-prolog) engine — no external
Prolog required.
