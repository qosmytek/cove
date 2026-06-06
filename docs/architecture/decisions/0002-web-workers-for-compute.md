# ADR-0002 · Run compute in Web Workers (with cross-origin isolation)

> **Status:** Accepted · **Date:** 2026-06-06 · **Owner:** Victor Senna Seleimend · ← [ADR index](./README.md)

## Context
WASM compute is heavy and would freeze the UI if run on the main thread, breaking the "fast" promise and
60fps. Multi-threaded WASM (and the fastest `ffmpeg.wasm` / DuckDB paths) need `SharedArrayBuffer`, which
browsers gate behind **cross-origin isolation** (COOP/COEP headers).

## Decision
Run **all** heavy compute in **Web Workers**. Serve the hosted app with **COOP/COEP** to enable
`SharedArrayBuffer` and multi-threading where available. **Detect** support at runtime and fall back to
**single-threaded** WASM when isolation/threads are unavailable (e.g., some `file://` single-file
contexts).

## Consequences
- ✅ Main thread holds 60fps; jobs are cancelable.
- ✅ Faster multi-threaded compute where supported.
- ⚠️ COOP/COEP can complicate embedding third-party resources — acceptable, since we ship none
  ([Calm by Design](../../features/07-calm-design.md)).
- ⚠️ The single-threaded fallback is slower → communicate progress and keep it within reason on the
  reference device.
- 🔗 Supports [Local-First Core](../../features/01-local-first-core.md) and
  [Single-File App](../../features/02-single-file-app.md).
