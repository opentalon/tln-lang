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

## The loop

1. A message arrives on a **channel** (Slack, HTTP, …).
2. The **core/LLM** interprets intent and — where a decision is needed — emits a **Tln scenario**.
3. **Tln** reasons over facts (pulled from `tln-db`, RAG, or `collect`/`enrich` via MCP), applies
   the experts' rules, and produces a deterministic, explainable decision.
4. Approved actions dispatch through **plugins** (`tln-mcp` tools, channels), each isolated.

The result is an AI system whose decisions are reproducible, auditable, and governed by the people
accountable for them — with Tln as the deterministic brain at the center.

## Explore

- [`opentalon/opentalon`](https://github.com/opentalon/opentalon) — the orchestration core
- [`tln-language`](https://github.com/opentalon/tln-language) · [`tln-mcp`](https://github.com/opentalon/tln-mcp) · [`tln-db`](https://github.com/opentalon/tln-db)
- Background: [Enterprise AI Orchestration](https://opakalex.github.io/posts/enterprise-ai-orchestration/) · [Expert-in-the-Loop](https://opakalex.github.io/posts/expert-in-the-loop/)
