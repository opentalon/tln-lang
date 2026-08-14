---
title: "Prolog → Tln"
description: "The same expert-system logic, modernized: ISO Prolog on the left, Tln on the right."
---

Prolog invented logic programming and powered a generation of expert systems. Its ideas — facts,
rules, backward-chaining inference — are timeless, and it has been a stable ISO standard
(**ISO/IEC 13211-1**) since **1995**. Its *ergonomics* are another matter: you hand-roll the
query-and-format plumbing, conflict resolution is manual, side effects mean `assert`/`retract`,
and there's no built-in way to test a ruleset, learn a threshold, or call an external tool.

Tln keeps the logic and modernizes everything around it. These pages put the two side by side —
**ISO Prolog on the left, Tln on the right** — using real programs from the Tln examples. The
Prolog is idiomatic **ISO Prolog (ISO/IEC 13211-1:1995 or later)**, syntax-checked with
SWI-Prolog; the Tln is the actual `.tln` source, validated with the `tln` compiler.

Both reason over the same external facts, loaded as generic triples:

```text
record(Entity, Id, Type, Category, Status, Date)
attr(Entity, Id, Name, Value)
```
