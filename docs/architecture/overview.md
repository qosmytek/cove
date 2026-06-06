# Architecture Overview

> **Status:** Draft · **Last updated:** 2026-06-06 · **Owner:** Victor Senna Seleimend
> **Section:** [Architecture](./) · ← [Documentation Index](../README.md)

## Guiding idea
The architecture exists to make one sentence true: **user data never leaves the device.** Everything
else — workers, WASM, OPFS, the service worker — is in service of that, plus the corollary that the app
must stay **fast** despite shipping heavy engines.

## The shape (layers)
1. **App shell (main thread)** — small, fast UI: routing between tools, file pickers, the
   [command palette](../features/08-command-palette.md), progress display. Must work *before* any engine
   loads ([progressive enhancement](../quality/progressive-enhancement.md)).
2. **Compute layer (Web Workers)** — where heavy WASM runs (`ffmpeg.wasm`, DuckDB-WASM, Pyodide,
   on-device AI). Keeps the main thread at 60fps. See
   [ADR-0002](./decisions/0002-web-workers-for-compute.md).
3. **Storage layer** — **OPFS** for fast scratch, **IndexedDB** for the
   [encrypted vault](../features/03-encrypted-vault.md), **Cache Storage** for the
   [service worker](../features/06-offline-pwa.md) and cached engines. See [Data Flow](./data-flow.md).
4. **Platform / runtime** — the browser PWA; optionally a
   [single-file `.html`](../features/02-single-file-app.md) distribution.

## Runtime model (one task)
```
User intent ──> shell discloses engine size ──> lazy-load WASM into a worker
   │                                                   │
   │  pick file (FS Access API)                        ▼
   └──> file handle ──> worker reads bytes ──> compute (OPFS scratch) ──> result
                                                       │
                          save via FS Access API <─────┘   (nothing transmitted)
```

## Properties the architecture enforces
- **No egress of user bytes** — there is no API the file is ever sent to. See
  [Privacy & Security](../quality/privacy-security.md).
- **Lazy, intent-gated heavy loads** — engines aren't in the initial payload. See
  [Performance Budget](../quality/performance-budget.md).
- **Responsive UI** — compute is off the main thread.
- **Offline** — shell precached; engines cached after first use.
- **Graceful degradation** — capability detection picks the best available path. See
  [Progressive Enhancement](../quality/progressive-enhancement.md).

## Cross-origin isolation
Multi-threaded WASM needs `SharedArrayBuffer`, which requires **cross-origin isolation** (COOP/COEP
headers). We assume we can set these for the hosted PWA, with a single-threaded fallback where we can't
(e.g., some `file://` single-file contexts). See [ADR-0002](./decisions/0002-web-workers-for-compute.md).

## What this is *not*
- No backend application servers; the only server role is a **static CDN** serving immutable assets.
- No user database, no session store, no file storage.

See also: [Tech Stack](./tech-stack.md) · [Data Flow](./data-flow.md) · [Decisions](./decisions/README.md)
