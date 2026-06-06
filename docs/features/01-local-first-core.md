# 01 · Local-First Core

> **Status:** Draft · **Last updated:** 2026-06-06 · **Owner:** Victor Senna Seleimend
> **Section:** [Features](./README.md) · **Source idea:** (1) · **In v1:** ✅ core
> ← [Feature index](./README.md)

## Summary
The heart of the product: do the heavy lifting **in the browser**, on the user's own files, with
nothing transmitted. Every tool is built on this capability.

## User value
"My file is processed on my machine. It never leaves. It's fast, and it works offline." The entire
promise rests here.

## How we build it
- **Compute in WebAssembly**, chosen per task:
  - Media → `ffmpeg.wasm` (powers the v1 video compressor).
  - Data → `sql.js` / **DuckDB-WASM**.
  - Python libraries → **Pyodide**.
- **Local file I/O** via the **File System Access API** for reading and saving, plus **OPFS** (Origin
  Private File System) for fast scratch space. See [Data Flow](../architecture/data-flow.md).
- **All heavy compute in [Web Workers](../architecture/decisions/0002-web-workers-for-compute.md)** so
  the main thread holds **60fps**. The UI never blocks on compute.

## What to watch out for
- **Watch the weight.** Lazy-load each engine **only when a task actually starts** — never on page
  load. This is the single most important rule; see
  [Performance Budget](../quality/performance-budget.md).
- **Test on a real mid-range phone**, not a laptop. Memory and CPU there are the true constraint.

## Requirements
- **LC-1** No user file bytes are transmitted (enforces [FR-P1](../product/prd.md#51-platform-apply-to-every-tool)).
- **LC-2** Engines are lazy-loaded behind explicit user intent (FR-P2).
- **LC-3** Compute runs in workers; the main thread stays responsive (FR-P3).
- **LC-4** File read/write uses FS Access API + OPFS, with a fallback (FR-P4).
- **LC-5** Large inputs use OPFS scratch / streaming where feasible and degrade gracefully (FR-V7).

## Capability detection & fallback
Detect `SharedArrayBuffer` (requires
[cross-origin isolation](../architecture/decisions/0002-web-workers-for-compute.md)), OPFS, and the FS
Access API. Where missing: fall back to single-threaded WASM, in-memory buffers, and
`<input type="file">` + download. See [Progressive Enhancement](../quality/progressive-enhancement.md).

## Acceptance criteria
- [ ] A representative video compresses on the mid-range reference device, offline, with no egress.
- [ ] The engine is fetched only after the user starts a task, with its size disclosed first.
- [ ] The UI stays interactive (and cancelable) during compression.

## Dependencies
[Tech Stack](../architecture/tech-stack.md) · [Architecture Overview](../architecture/overview.md) ·
[Offline PWA](./06-offline-pwa.md) (for caching engines after first use).

## Open questions
- One shared `ffmpeg.wasm` build for all media tools, or tailored builds to save bytes?

The reference device is **settled** — Samsung Galaxy A54 5G — see [PRD §10](../product/prd.md#10-decisions--open-questions)
and the [device matrix](../engineering/testing-strategy.md#device--browser-matrix).
