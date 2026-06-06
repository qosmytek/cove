# ADR-0001 · Do heavy compute in WebAssembly

> **Status:** Accepted · **Date:** 2026-06-06 · **Owner:** Victor Senna Seleimend · ← [ADR index](./README.md)

## Context
The product's core promise is that real work (media/data/file transforms) happens on the user's device.
Plain browser JS can't match the performance or maturity of established C/C++ tooling for these tasks,
and we refuse to upload data to a server.

## Decision
Run heavy compute as **WebAssembly**: `ffmpeg.wasm` for media (the v1 video compressor), DuckDB-WASM /
`sql.js` for data, Pyodide for Python, and `transformers.js` / WebLLM for AI. Each engine is
**lazy-loaded only on explicit user intent**.

## Consequences
- ✅ Mature, fast, on-device compute with no egress.
- ✅ Reuses battle-tested libraries.
- ⚠️ Large payloads — **the #1 risk** ([Performance Budget](../../quality/performance-budget.md)).
  Mitigated by lazy-loading, caching, capability detection, and fallbacks.
- ⚠️ Some engines want threads (`SharedArrayBuffer`) → see [ADR-0002](./0002-web-workers-for-compute.md).
- 🔗 Realized by [Local-First Core](../../features/01-local-first-core.md).
