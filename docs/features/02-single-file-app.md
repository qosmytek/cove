# 02 · Single-File App

> **Status:** Draft · **Last updated:** 2026-06-11 · **Owner:** Victor Senna Seleimend
> **Section:** [Features](./README.md) · **In v1:** Phase 3 — built & verified (single-file redactor runs from `file://` with zero egress)
> ← [Feature index](./README.md)

## Summary
Ship a focused version of a tool inlined into **one self-contained `.html` file** that runs from an
email attachment, a USB stick, or an air-gapped machine — and still opens a decade from now.

## User value
- The air-gapped operator and the privacy maximalist get a tool with **no install, no network, no
  dependencies** — a single file they can inspect, archive, and trust.
- Longevity: no build server, no CDN, no link rot. It just keeps working.

## How we build it
- Bundle with **`vite-plugin-singlefile`** (see `vite.config.single.ts`), inlining JS, CSS, and the
  pdf.js worker (a `?worker&inline` blob) into one `.html`; `publicDir` is off so nothing lands beside it.
- A `__SINGLE_FILE__` build flag drops same-origin URLs that need a server (e.g. the standard-font path).
- Target a **focused single utility**, not the full app.

## What to watch out for
- **No code-splitting** in a single file: the whole payload loads at once, so **keep it to a focused
  utility**, not a sprawling app. Heavy engines (large WASM, AI weights) are a poor fit for inlining
  and may stay in the hosted PWA only.
- Reconcile with the [performance budget](../quality/performance-budget.md): the single-file variant is
  a *distribution mode*, judged on total size for its one job.

## Requirements
- **SF-1** Produce a `.html` that runs offline from `file://` with no external requests.
- **SF-2** Scope each single-file build to **one** tool.
- **SF-3** Keep total size defensible for that one job (see [perf budget](../quality/performance-budget.md)).
- **SF-4** Degrade gracefully where `file://` restricts an API (e.g., no cross-origin isolation →
  single-threaded path).

## Capability detection & fallback
`file://` contexts can lack cross-origin isolation and some storage APIs; detect and fall back to the
single-threaded, in-memory path. See [Progressive Enhancement](../quality/progressive-enhancement.md).

## Acceptance criteria
- [x] A built `.html` opens and completes its task offline from `file://` (e.g. a USB stick).
- [x] Opening the file generates **zero** network requests — only the local file and an in-memory
  `blob:` worker, no `http(s)` (verified in DevTools).

Verified by a hands-on `file://` run: it loads, redacts, and saves a PDF with zero egress. **Known
issue (non-fatal):** on first open, the browser logs a cross-origin **error** — it blocks an `import`
that pdf.js issues during worker setup, because each `file://` page is a unique opaque origin. pdf.js
proceeds regardless, so it affects neither the result nor the zero-egress guarantee, and it clears on
reload. A clean fix needs an upstream pdf.js/Vite change, so it is accepted for v1.

## Dependencies
[Local-First Core](./01-local-first-core.md) · [Tech Stack](../architecture/tech-stack.md) ·
[ADR-0004 single-file build target](../architecture/decisions/0004-single-file-build-target.md).

## Status & open questions
**Built (2026-06-11):** the [PDF redactor](./09-pdf-redactor.md) ships a single-file build —
`npm run build:single` → `dist-single/redact.html` (~2.0 MB: pdf.js + its worker + pdf-lib, all
inlined), realizing [ADR-0004](../architecture/decisions/0004-single-file-build-target.md). The redactor
needs no `SharedArrayBuffer`, so `file://` (SF-4) is fine; the same-origin standard fonts are omitted
there, so non-embedded base-14 fonts fall back to substitutes — embedded fonts are unaffected.

**Deferred from Phase 2 toward Phase 3** ([Roadmap](../product/roadmap.md)): a single-file build of the
*compressor* is awkward — its ffmpeg cores are too large to inline — so this lands better once a
lighter tool exists.
- **Which tool first — decided (2026-06-10):** the [PDF redactor](./09-pdf-redactor.md) leads Phase 3
  and is the first single-file target — lighter than the compressor, with no `SharedArrayBuffer`
  dependency.
- **Inline vs. beside — decided (2026-06-10):** for the redactor, **inline** — `pdf.js` + `pdf-lib` are
  light, JS-only, and need no `SharedArrayBuffer`
  ([ADR-0010](../architecture/decisions/0010-pdf-redaction-engine.md)), so the whole tool fits one
  `.html` (the worker is inlined as a blob URL). The general rule stands: inline JS/CSS and small WASM,
  keep a *heavy* engine (the ffmpeg cores) beside or hosted-only.
