# 02 · Single-File App

> **Status:** Draft · **Last updated:** 2026-06-09 · **Owner:** Victor Senna Seleimend
> **Section:** [Features](./README.md) · **In v1:** ⏳ Phase 3 (deferred from Phase 2)
> ← [Feature index](./README.md)

## Summary
Ship a focused version of a tool inlined into **one self-contained `.html` file** that runs from an
email attachment, a USB stick, or an air-gapped machine — and still opens a decade from now.

## User value
- The air-gapped operator and the privacy maximalist get a tool with **no install, no network, no
  dependencies** — a single file they can inspect, archive, and trust.
- Longevity: no build server, no CDN, no link rot. It just keeps working.

## How we build it
- Bundle with **esbuild** or **`vite-plugin-singlefile`**, inlining JS, CSS, and (where small enough)
  WASM as base64 / data URIs into a single `.html`.
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
- [ ] A built `.html` opens and completes its task from a USB stick with networking disabled.
- [ ] Opening the file generates **zero** network requests (verify in DevTools).

## Dependencies
[Local-First Core](./01-local-first-core.md) · [Tech Stack](../architecture/tech-stack.md) ·
[ADR-0004 single-file build target](../architecture/decisions/0004-single-file-build-target.md).

## Status & open questions
**Deferred from Phase 2 toward Phase 3** ([Roadmap](../product/roadmap.md)): a single-file build of the
*compressor* is awkward — its ffmpeg cores are too large to inline — so this lands better once a
lighter tool exists. Current leaning on the open questions:
- **Which tool first:** a lighter tool than the video compressor (e.g. the PDF redactor).
- **Inline vs. beside:** inline JS/CSS and small WASM; keep large engines (the ffmpeg cores) *beside*
  the HTML (or hosted-only) — base64-inlining them breaks both the "single file" spirit and the budget.
