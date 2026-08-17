---
title: "Tln in production — OpenTalon"
description: "OpenTalon is the enterprise AI-orchestration system that runs on Tln: the LLM handles intent, Tln handles knowledge and inference."
---

Tln is a language; **[OpenTalon](https://github.com/opentalon/opentalon)** is where it runs at
enterprise scale. OpenTalon is an open-source, Go-built AI-orchestration platform for
organizations that need AI in production — predictable behaviour, auditable boundaries,
deterministic business rules, and expert-defined guardrails. Tln is its decision core.

## The division of labour

The core idea is **Expert-in-the-Loop (EITL)**: the LLM handles conversation and intent; **Tln
handles knowledge and inference**. Two ways Tln shows up:

- **The LLM writes Tln, not raw tool calls.** Following the same insight as Cloudflare's *Code
  Mode for MCP*, OpenTalon has the model emit **Tln scenarios** in a deliberately restricted DSL
  rather than orchestrating tool calls directly. The grammar physically cannot express unsafe
  operations, so the sandbox is *structural* — not a policy you hope the model follows.
- **Domain experts write Tln rules and workflows.** The gates, policies, and review steps that
  govern a decision are authored once by the people who own them, and the runtime enforces them
  deterministically — the same rules you've seen throughout these docs.

So a request flows: **user → core/LLM (intent) → Tln (facts, rules, decision) → plugins (act)**,
with people reserved for the rare case that genuinely needs them.

<figure class="eitl">
<svg viewBox="0 0 840 220" role="img" xmlns="http://www.w3.org/2000/svg" aria-label="Expert-in-the-Loop: a channel message goes to the LLM for intent, the LLM emits a Tln scenario, Tln decides deterministically over facts and rules, plugins act, and the outcome returns to the user; Tln escalates only the rare exception to a human.">
  <defs>
    <marker id="ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" class="arrow"/>
    </marker>
  </defs>

  <!-- Human (exceptions only) -->
  <rect class="box" x="450" y="14" width="160" height="42" rx="21"/>
  <text class="title" x="530" y="33" text-anchor="middle">Human</text>
  <text class="sub" x="530" y="48" text-anchor="middle">only exceptions</text>
  <path class="flow-dash" d="M530,88 L530,60" marker-end="url(#ah)"/>

  <!-- Pipeline -->
  <rect class="box" x="10"  y="90" width="160" height="64" rx="10"/>
  <text class="title" x="90"  y="118" text-anchor="middle">Channel</text>
  <text class="sub"   x="90"  y="136" text-anchor="middle">user message</text>

  <rect class="box" x="230" y="90" width="160" height="64" rx="10"/>
  <text class="title" x="310" y="118" text-anchor="middle">LLM</text>
  <text class="sub"   x="310" y="136" text-anchor="middle">intent · language</text>

  <rect class="box box-tln" x="450" y="90" width="160" height="64" rx="10"/>
  <text class="title title-tln" x="530" y="116" text-anchor="middle">Tln</text>
  <text class="sub"   x="530" y="136" text-anchor="middle">facts · rules · decision</text>

  <rect class="box" x="670" y="90" width="160" height="64" rx="10"/>
  <text class="title" x="750" y="118" text-anchor="middle">Plugins</text>
  <text class="sub"   x="750" y="136" text-anchor="middle">tools · act</text>

  <!-- Flow arrows -->
  <path class="flow" d="M170,122 L226,122" marker-end="url(#ah)"/>
  <path class="flow" d="M390,122 L446,122" marker-end="url(#ah)"/>
  <path class="flow" d="M610,122 L666,122" marker-end="url(#ah)"/>

  <!-- Return loop: outcome back to the user -->
  <path class="flow" d="M750,154 L750,196 L90,196 L90,158" marker-end="url(#ah)"/>
  <text class="lbl" x="420" y="190" text-anchor="middle">outcome to the user</text>
</svg>
<figcaption>Expert-in-the-Loop — the LLM handles intent, Tln makes the deterministic decision, and a human is called only for the rare exception.</figcaption>
</figure>

## Every IO edge is a plugin

Tln's core is a pure language + planner with **transport-free** IO: it decides *what* should
happen and returns it as data. OpenTalon provides the edges as **isolated plugins**, each running
as a **separate OS process over gRPC** — a compromised or buggy plugin can never read the core's
memory, and plugins can't call each other; only the core/LLM decides what runs next.

- **Tools** — [`tln-mcp`](https://github.com/opentalon/tln-mcp) resolves `tool` calls over the
  Model Context Protocol. See [MCP & workflows](/beyond-prolog/mcp-workflows/).
- **Storage** — [`tln-db`](https://github.com/opentalon/tln-db), the Go-native fact store behind
  the `FactStore` interface (bbolt + roaring-bitmap index + HNSW vectors).
- **Channels** — Slack, HTTP, MS Teams, WebSocket, console.
- **Security & retrieval** — `guard-llm` (LLM guardrails), `weaviate` (RAG / vector search).

The same shape as the language: a deterministic core, with `tln-mcp` on the tool side and `tln-db`
on the storage side, and OpenTalon composing the rest into a production system.

Because OpenTalon is the **host**, its plugin bindings **win** over any `connector` a program
declares — so the very same rules run standalone (`tln run` with in-source connectors) or hosted,
unchanged. And since OpenTalon runs **LLM-authored** Tln, it sandboxes that source: `env` is cut
and `io` restricted, so a generated scenario can't reach secrets or the filesystem. See
[the two run modes](/plugins/#two-ways-to-run--standalone-or-hosted).

## The loop

1. A message arrives on a **channel** (Slack, HTTP, …).
2. The **core/LLM** interprets intent and — where a decision is needed — emits a **Tln scenario**.
3. **Tln** reasons over facts (pulled from `tln-db`, RAG, or `collect`/`enrich` via MCP), applies
   the experts' rules, and produces a deterministic, explainable decision.
4. Approved actions dispatch through **plugins** (`tln-mcp` tools, channels), each isolated.

The result is an AI system whose decisions are reproducible, auditable, and governed by the people
accountable for them — with Tln as the deterministic brain at the centre.

## Explore

- [`opentalon/opentalon`](https://github.com/opentalon/opentalon) — the orchestration core
- [`tln-language`](https://github.com/opentalon/tln-language) · [`tln-mcp`](https://github.com/opentalon/tln-mcp) · [`tln-db`](https://github.com/opentalon/tln-db)
- Background: [Enterprise AI Orchestration](https://opakalex.github.io/posts/enterprise-ai-orchestration/) · [Expert-in-the-Loop](https://opakalex.github.io/posts/expert-in-the-loop/)
