# Architecture Decision Records (ADRs)

> **Status:** Draft · **Last updated:** 2026-06-06 · **Owner:** Victor Senna Seleimend
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

## Proposed / future
- UI framework (or none)
- Test / E2E tooling

New ADRs copy the structure of [ADR-0001](./0001-wasm-compute-engines.md).
