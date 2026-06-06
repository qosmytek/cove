# ADR-0006 · `ffmpeg.wasm` build and threading

> **Status:** Accepted · **Date:** 2026-06-06 · **Owner:** Victor Senna Seleimend · ← [ADR index](./README.md)

## Context
The v1 flagship is a video compressor on `ffmpeg.wasm` ([ADR-0001](./0001-wasm-compute-engines.md)),
proven first in the
[Phase 0 prototype](../../product/roadmap.md#phase-0--riskiest-first-prototype-starting-2026-06).
`ffmpeg.wasm` ships single-threaded and multi-threaded (`-mt`) cores; the multi-threaded core is faster
but needs `SharedArrayBuffer`, which requires cross-origin isolation
([ADR-0002](./0002-web-workers-for-compute.md)). We must commit to a concrete build to prototype against.

## Decision
Use **`@ffmpeg/ffmpeg`** with the **multi-threaded core (`core-mt`)** as the primary path — run in a
[Web Worker](./0002-web-workers-for-compute.md) and served under **COOP/COEP**. **Detect**
`SharedArrayBuffer` at runtime and **fall back to the single-threaded core** where isolation or threads
are unavailable (e.g. some `file://` [single-file](./0004-single-file-build-target.md) contexts). The
exact package version and any custom/stripped build are pinned during Phase 0 against the
[performance budget](../../quality/performance-budget.md).

## Consequences
- ✅ Fast multi-threaded compute where supported; a working single-threaded path everywhere else.
- ✅ Resolves the open "threading flavor" question and gives Phase 0 a concrete engine to measure.
- ⚠️ Requires COOP/COEP on the host — a
  [Phase 0 prerequisite](../../product/roadmap.md#phase-0--riskiest-first-prototype-starting-2026-06).
- ⚠️ The multi-threaded core is heavier; its size is disclosed on intent and counts against the
  lazy-loaded [performance budget](../../quality/performance-budget.md).
- 🔗 Realizes part of [Local-First Core](../../features/01-local-first-core.md); validated by the Phase 0 prototype.
