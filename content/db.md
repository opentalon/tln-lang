---
title: "Tln DB"
description: "tln-db — the Go-native embedded fact store and query engine behind Tln's FactStore interface."
---

[`tln-db`](https://github.com/opentalon/tln-db) is the **Go-native embedded fact store and query
engine** for Tln. It sits behind the `FactStore` interface (see [Plugins](/plugins/)), so the
language core stays storage-agnostic while `tln-db` provides a fast, durable, self-contained backend.

Facts are the entity–attribute records Tln reasons over — loaded from your systems, never written
in `.tln`. `tln-db` stores, indexes, and queries them.

## Two ways to run it

- **Embedded** — a Go library, in-process (`bboltstore.Open()`).
- **Sidecar** — a standalone `tlndb-server` over gRPC (Unix socket or TCP) with an HTTP/JSON debug
  endpoint, so several processes can share one store (Postgres-style local socket).

## Select it as your store

With the [bundle system](/plugins/#bundling--modtln), tln-db is a **store plugin** you declare in
`mod.tln` and point at the sidecar in `config/store.tln` — Active-Record style, no Go host:

```tln
# mod.tln
plugin "db" "v0.1.0" store
```

```tln
# config/store.tln
store db { target env "TLNDB_ADDR" }   # e.g. unix:///tmp/tlndb.sock
```

`tln bundle` wires it in through the store factory; the bundled `tlnstore` client is **thin** — it
just dials `tlndb-server` (no bbolt / HNSW / roaring pulled in), so a bundle stays light while the
heavy engine lives in the sidecar.

## What's inside

Built on proven Go building blocks, tuned for rule evaluation:

- **Document store** — snappy-compressed JSON in **per-tenant buckets** (strict isolation), ACID,
  SIGKILL-durable, on **bbolt** (B+ tree).
- **Inverted index** — **roaring-bitmap**-backed lookups: equality, numeric ranges, temporal
  windows, group-by, closure tables, running stats (Welford), and absence queries.
- **Vector search** — per-(entity, scope) **HNSW** index with cosine / Euclidean distance, for the
  language's `find similar` / retrieval needs.
- **Composite queries** — `Query` (pattern / predicate / or / not / full-text + aggregates +
  group-by), `SequenceJoin`, `ClusterQuery`, and a streamed `Subscribe` for reactive consumers.

Queries run in two phases: **narrow** (intersect docID bitmaps from the inverted index) then
**evaluate** (decode candidates and check the remaining clauses) — index-fast where it can be,
exact where it must be.

## Swappable and tested

`tln-db` ships a **conformance suite** that any `FactStore` backend runs against, so alternatives
(in-memory, Pebble, …) can drop in without language-level changes. Timestamps are clock-injectable
for **deterministic** tests, and a mutation event stream (assert / change / retract) makes changes
auditable — the same determinism-and-explainability story as the language itself.

Source: [github.com/opentalon/tln-db](https://github.com/opentalon/tln-db).
