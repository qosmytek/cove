# Architecture Decision Records (ADRs)

> **Status:** Draft · **Last updated:** 2026-06-10 · **Owner:** Victor Senna Seleimend
> **Section:** [Architecture](../) · ← [Documentation Index](../../README.md)

We record significant or contested architectural decisions as short, numbered ADRs. When a decision
changes, we **add a new ADR** that supersedes the old one rather than editing history.

## Format
Each ADR follows **Context → Decision → Consequences**, with a status line. Keep them short.

## Index
| # | Decision | Status |
| - | -------- | ------ |
| [0001](./0001-wasm-compute-engines.md) | Do heavy compute in WebAssembly | Accepted |
| [0002](./0002-web-workers-for-compute.md) | Run compute in Web Workers (+ cross-origin isolation) | Accepted |
| [0003](./0003-opfs-and-fs-access-api.md) | Use OPFS + File System Access API for files | Accepted |
| [0004](./0004-single-file-build-target.md) | Support a single-file `.html` build target | Accepted |
| [0005](./0005-no-server-no-account.md) | No server-side processing, no accounts | Accepted |
| [0006](./0006-ffmpeg-build-and-threading.md) | `ffmpeg.wasm` build + threading (multi-threaded core, single-threaded fallback) | Accepted |
| [0007](./0007-video-engine-webcodecs-with-ffmpeg-fallback.md) | Video engine: WebCodecs fast path + `ffmpeg.wasm` fallback | Accepted |
| [0008](./0008-no-ui-framework.md) | No UI framework for v1 (vanilla TS + native DOM) | Accepted |
| [0009](./0009-test-and-ci-tooling.md) | Test & CI tooling (Vitest, Playwright, Lighthouse CI, GitHub Actions) | Accepted |
| [0010](./0010-pdf-redaction-engine.md) | PDF redaction engine & strategy: rasterize-and-rebuild (`pdf.js` + `pdf-lib`) | Accepted |

## Proposed / future
- _None open — the UI-framework and test/CI-tooling questions are now decided (ADR-0008, ADR-0009)._

New ADRs copy the structure of [ADR-0001](./0001-wasm-compute-engines.md).
