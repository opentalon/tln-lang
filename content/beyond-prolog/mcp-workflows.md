---
title: "MCP tools & workflows"
weight: 1
description: "React to fact changes, orchestrate MCP tools, and ingest data on a schedule — first-class in Tln, absent from Prolog."
---

Prolog is a pure inference engine. It answers queries; it does not *do* things. There is no
standard way to call an external tool, and nothing reactive — a fact changing can't fire an
action, because the language has no notion of "an action" or of "changing." In practice you bolt
on non-standard extensions and hand-roll all the orchestration yourself.

Tln makes tools and reactivity first-class, through the **Model Context Protocol (MCP)**. This is
the capability that turns a ruleset into a running agent — and it's what powers
[OpenTalon](/opentalon/) in production.

## React to a fact change → call a tool

When an item's stock hits zero, place a refill order. In Tln an `on change` block *fires* a
`workflow`, and a `step` calls the `inventory` MCP tool directly. This example is real:
[`examples/refill_agent`](https://github.com/opentalon/tln-language/blob/master/examples/refill_agent/refill_agent.tln).

{{< compare >}}
{{< pane title="ISO Prolog (1995)" lang="prolog" >}}
% No tool calls, no "on change" trigger. Even with non-standard
% SWI extensions, the orchestration is hand-rolled:
:- use_module(library(process)).

refill(Id) :-
    process_create(path(inventory_cli),
        ['create-refill-order', '--item', Id, '--qty', '5'],
        [process(_)]).

% ...and you must notice the stock-out and call refill/1
% yourself. There is no declarative trigger on a fact
% changing to 0.
{{< /pane >}}
{{< pane title="Tln" lang="tln" >}}
on change attr "current_stock" to 0 {
  logger.warn "stock-out detected for item {event.entity}"
  workflow "Refill stock"
}

workflow "Refill stock" {
  step "reorder" {
    tool "inventory" "create-refill-order" {
      item_id  step("trigger").result.entity
      quantity 5
    }
  }
}
{{< /pane >}}
{{< /compare >}}

## Ingest facts on a schedule

Facts come from the outside world — so Tln can pull them in. A `collect` block declares *what* to
fetch (via MCP) and *when*; the host fires it on schedule and the results land as facts, ready for
rules to reason over. Retries and error handling are declarative too.

```tln
collect "Failure training data" {
  schedule weekly
  tool "inventory" "list-items" {
    query    "status:defective"
    per_page 100
    on_error {
      retry 3 times
      then log "collect failed: {error}"
      then skip
    }
  }
  store results as training_facts tag "failure_training"
}
```

## Branch and fan out while remediating

A `detect` can carry a `remediate` body with real control flow — `if`/`else` on the matched row,
and `for each` to fan an action across channels — every leaf a tool call:

```tln
detect "Overdue for service" {
  for records where type == "vehicle"
    and attr "km" > attr "last_service_km" + 20000
  flag matching items
  remediate {
    if attr "priority" == "CRITICAL" {
      tool "ops" "page_oncall" { vehicle attr "id" severity "critical" }
    } else {
      tool "ops" "open_ticket" { vehicle attr "id" reason "overdue service" }
    }
    for each channel in ["fleet-ops", "maintenance"] {
      tool "slack" "notify" { channel channel text "Vehicle {item.id} overdue for service" }
    }
  }
}
```

## How the tools connect — the plugin system

The calls above use the plugin-neutral **`tool`** verb — `tool "server" "name" {…}` — and don't
hard-wire any transport. Tln's language core is **transport-free**: it decides *which* tool calls
fire and returns them as **data**; a host-injected `ToolResolver` performs the actual IO. The
server name is what routes: `tool "inventory" …` reaches an MCP server via
[`tln-mcp`](https://github.com/opentalon/tln-mcp) (the [Model Context Protocol](https://modelcontextprotocol.io)
over JSON-RPC), while `tool "io" "writeln"` reaches the built-in
[`io-tln`](https://github.com/opentalon/io-tln) plugin. Neither is baked into the language.

In the language you simply **name a server and a tool** — the transport is the host's concern:

```tln
workflow "Notify low stock" {
  step "reorder" {
    tool "inventory" "create-refill-order" { item_id item.id quantity 5 }
  }
  step "announce" {
    tool "slack" "post-message" { channel "#ops" text "reordered {item.id}" }
  }
}
```

Those `tool` calls — and `collect` / `enrich` / `remediate` — dispatch to the named server via
JSON-RPC `tools/call`. The host attaches `tln-mcp` (or a mock in tests, a direct HTTP client, an
internal bus) without touching a single rule.

This is the **tools leg** of Tln's plugin model, mirroring [`tln-db`](https://github.com/opentalon/tln-db)
on the **storage** side: the core is a pure language + planner + SPIs, and *every IO edge is a
plugin*. At the [OpenTalon](/opentalon/) layer the same model adds channels (Slack, HTTP, MS
Teams, WebSocket), security (`guard-llm`), and retrieval/RAG (`weaviate`).

## The whole loop

The decision stays deterministic and explainable; the *acting* — paging, ticketing, notifying,
reordering — happens through MCP tools the rule names directly. That's the whole loop: facts in,
a deterministic decision, and an action out — none of which ISO Prolog can express on its own.
