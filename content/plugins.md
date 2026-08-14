---
title: "Plugins"
description: "Tln's core is transport-free — every IO edge is a plugin: tools (tln-mcp), storage (tln-db), and the OpenTalon integrations."
---

Tln's language core is a **pure language + planner**: it decides *which* facts to read and *which*
tool calls to fire, and returns them as **data**. It performs no IO itself. Every edge that touches
the outside world — storage, tools, channels — is a **plugin** injected by the host. That's what
keeps the core deterministic and testable, and the system extensible.

## Tools — `tln-mcp`

In the language you name an MCP server and tool; the transport is the host's concern:

```tln
workflow "Notify low stock" {
  step "reorder" {
    mcp "inventory" "create-refill-order" { item_id item.id quantity 50 }
  }
  step "announce" {
    mcp "slack" "post-message" { channel "#ops" text "reordered {item.id}" }
  }
}
```

Those `mcp` calls (and `collect` / `enrich` / `remediate`) don't hard-wire any transport — the
core hands them to a host-injected `ToolResolver`. [`tln-mcp`](https://github.com/opentalon/tln-mcp)
is the ready-made resolver that speaks the **Model Context Protocol** over JSON-RPC; a mock, a
direct HTTP client, or an internal bus can stand in without touching a rule. See
[MCP & workflows](/beyond-prolog/mcp-workflows/) for more.

## Storage — `tln-db`

The other SPI is the `FactStore`. [`tln-db`](/db/) is the Go-native fact store behind it — embed it
as a library or run it as a gRPC/HTTP sidecar. The same interface accepts other backends
(in-memory for tests, Datalevin, …). Details on the **[DB](/db/)** page.

## The pattern

```text
                 ┌────────────────────────────┐
   facts  ─────► │  Tln core: parse → plan →   │ ─────► tool calls (as data)
                 │  evaluate  (deterministic)  │
                 └──────────┬─────────┬────────┘
                            │ SPI     │ SPI
                     FactStore      ToolResolver
                       tln-db          tln-mcp
```

## In production — OpenTalon plugins

At the [OpenTalon](/opentalon/) layer the same plugin model runs each edge as a **separate OS
process over gRPC**, isolated so a compromised plugin can't reach the core's memory or another
plugin. Beyond tools and storage, OpenTalon ships:

- **Channels** — Slack, HTTP, MS Teams, WebSocket, console.
- **Security** — `guard-llm` (LLM guardrails on every request).
- **Retrieval / RAG** — `weaviate` (vector search over company knowledge).

Same shape as the language: a deterministic core, with everything that does IO living behind a
plugin boundary.
