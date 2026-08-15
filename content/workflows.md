---
title: "Workflows & agents"
description: "Deterministic agents: the LLM authors a Tln automation once; the runtime executes it every tick with no model in the loop."
---

An **agent** in Tln is an automation the LLM writes *once* and the runtime then runs *forever* —
deterministically, with no model in the loop at run time. A user describes a task in chat
(*"watch stock item ABC-123; when it drops below 10, open a refill ticket"*), the LLM authors it
as **Tln source**, and a plugin stores it and runs it autonomously.

That split is the whole point (see the deep dive in
[**Deterministic Where It Matters**](https://opakalex.github.io/posts/deterministic-agent-pipeline/)):

- **Authoring** is probabilistic — the LLM is great at turning a fuzzy request into a small Tln
  program. This happens once.
- **Execution** is deterministic — from then on the runtime evaluates that program on every tick,
  over the facts of the moment. No model call, no sampling, no re-deciding. Same facts in, same
  decision out.

## A `workflow` fired by a trigger

Two blocks make an agent: an **`on` trigger** that watches the facts, and a **`workflow`** it fires.
A `workflow` is a sequence of `step`s, each calling a tool (see [Plugins](/plugins/)). This is the
real stock-watcher from [`opentalon-agents`](https://github.com/opentalon/opentalon-agents):

```tln
// Fire ONCE on the downward crossing below 10 (prev >= 10, new < 10) --
// not every tick while it stays low.
on change attr "current_stock" {
  when prev_value >= 10 and new_value < 10
  workflow "Refill stock"
}

workflow "Refill stock" {
  step "ticket" {
    tool "tickets" "create" {
      title "Refill needed for ABC-123"
      item  step("trigger").result.entity
      qty   50
    }
  }
}
```

The `on change` block is **edge-triggered**: it fires on the moment stock crosses below 10, not on
every tick while it stays low. The `workflow` then opens a ticket through the `tickets` tool —
`step("trigger").result.entity` threads the item that crossed the threshold into the call.

## How it runs — `opentalon-agents`

[`opentalon-agents`](https://github.com/opentalon/opentalon-agents) is the OpenTalon plugin that
owns the agent lifecycle: it stores the LLM-authored Tln source and its triggers, maps incoming
data to facts, keeps the fact snapshot, and records every run — all in its own store. It runs no
model at run time and no scheduler of its own; it rides the host's periodic `tick` and evaluates
the stored source reactively against the current facts.

```text
  user (chat) ── create ──►  opentalon-agents ──► stores Tln source + trigger
  host tick (every 1m) ───►  opentalon-agents ──► evaluate source over facts
                                                    │  on-block fires?
                                                    ▼
                                             workflow steps ──► tools (MCP / io)
```

Authoring stays with the LLM; the decision — every time, forever — is Tln's. That's a
**deterministic agent**: reproducible, auditable, and cheap to run.

See it in production in **[OpenTalon](/opentalon/)**, and the full argument in
[Deterministic Where It Matters](https://opakalex.github.io/posts/deterministic-agent-pipeline/).
