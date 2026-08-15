---
title: "Beyond Prolog"
description: "Beyond ISO Prolog: MCP tool orchestration, built-in ML, a real test framework, and compile-time metaprogramming."
---

The [comparisons](/comparisons/) show Tln matching Prolog rule-for-rule. These pages show where
Tln goes further than ISO Prolog:

- **[MCP tools & workflows](/beyond-prolog/mcp-workflows/)** — call real tools, react to fact
  changes, and ingest data on a schedule. Prolog is a pure inference engine with no standard
  tool I/O; Tln makes it first-class.
- **[Built-in ML](/beyond-prolog/ml/)** — `predict`, `forecast`, `classify`, `cluster`,
  `find similar` — 11 explainable primitives, no external pipeline.
- **[Testing](/beyond-prolog/testing/)** — a `.tln.test` framework with `given` / `when` /
  `expect`, so rules are verified, not hoped.
- **[Metaprogramming](/beyond-prolog/metaprogramming/)** — compile-time macros
  (`defmacro` / `quote` / `unquote`, Elixir-style) that generate rules before validation, keeping
  the runtime pure.
