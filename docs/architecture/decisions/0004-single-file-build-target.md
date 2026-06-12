# ADR-0004 · Support a single-file `.html` build target

> **Status:** Accepted · **Date:** 2026-06-06 · **Owner:** Victor Senna Seleimend · ← [ADR index](./README.md)

## Context
Some users (air-gapped, archival, maximally private) value a tool that is one inspectable file with no
network and no install — and that still opens years from now.

## Decision
Maintain a **single-file `.html`** distribution (via `vite-plugin-singlefile` / esbuild) for **focused,
lighter tools**, inlining JS/CSS and small WASM. This is a **distribution mode**, not the primary app;
heavy engines may remain hosted-PWA-only.

## Consequences
- ✅ Ultimate portability and longevity; trivially auditable.
- ⚠️ **No code-splitting** — it must stay a focused utility (per the brief).
- ⚠️ `file://` may lack cross-origin isolation → single-threaded fallback
  ([ADR-0002](./0002-web-workers-for-compute.md)).
- 🔗 **Realized in Phase 3** by the [PDF redactor](../../features/09-pdf-redactor.md)'s single-file
  build (`vite.config.single.ts` · `npm run build:single`) — see
  [Single-File App](../../features/02-single-file-app.md). The pdf.js worker is inlined (`?worker&inline`
  blob) and a `__SINGLE_FILE__` flag drops the same-origin font URL that `file://` can't serve.
