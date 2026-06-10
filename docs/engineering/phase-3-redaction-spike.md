# Phase 3 — PDF Redaction Spike (rasterize-and-rebuild)

> **Status:** Draft · **Last updated:** 2026-06-10 · **Owner:** Victor Senna Seleimend
> **Section:** [Engineering](./) · ← [Documentation Index](../README.md)

The riskiest-first spike for the [PDF redactor](../features/09-pdf-redactor.md), validating
[ADR-0010](../architecture/decisions/0010-pdf-redaction-engine.md) **before any UI** — the redactor's
equivalent of the [Phase 0](./phase-0-measurement.md) video benchmark. Risk retired: **does
"rasterize-and-rebuild" actually make redacted content unrecoverable** (RD-2 / RD-6 / risk
[R10](../reference/risks.md))?

## What it proves
A page that contains a redaction is rendered to pixels, the opaque mark is painted on, and the output is
rebuilt as a **fresh** document with that flattened image as the page — untouched pages copied as-is.
Because the redacted page becomes an image, the sensitive content carries **no text, vector, or image
objects**, so there is nothing to recover.

## Method (headless Node proxy)
The security property is environment-independent, so the spike runs in Node — the way Phase 0 used a
throttled desktop as a proxy for the A54. Browser-only concerns (FS Access, worker inlining) are left to
e2e. Libraries (installed `npm install --no-save pdf-lib pdfjs-dist @napi-rs/canvas`; the tool will
adopt `pdf-lib` + `pdfjs-dist` as real deps when it is built):

- `pdf-lib` — author the input; embed the flattened image; copy untouched pages; save.
- `pdfjs-dist` — render the redacted page, and (for verification) extract text from input and output.
- `@napi-rs/canvas` — the canvas backend so `pdf.js` can render headlessly.

Pipeline: author a 2-page input (page 1 holds `SECRET-12345` + an `Author`; page 2 holds
`KEEP-ME-INTACT`) → render page 1 → paint the mark → rebuild a fresh doc (image page 1 + copied page 2)
→ extract text from the output and assert. The prototype lives at `spike/redaction-spike.mjs`
(gitignored, like the Phase 0 prototype); run it with `node spike/redaction-spike.mjs`.

## Outcome (2026-06-10): PASS
All assertions held:
- Output contains **no recoverable `SECRET-12345`** on any page.
- The redacted page has **no text layer** (fully rasterized).
- The untouched page **keeps its text** (`KEEP-ME-INTACT`).
- The rebuilt document carries **no `Author` metadata** from the source.
- Visual check (`spike/out/page1-redacted.png`): faithful render with the mark over the secret line.

## What this green-lights
Build the redactor tool (`src/tools/redact.ts`) on this pipeline, behind the
[tool contract](./adding-a-tool.md), with the security assertion promoted to a permanent **RD-6** test.

## Known follow-ups (from ADR-0010)
- Redacted pages lose their searchable text layer — the deferred text-preserving path.
- Region-accurate mark placement from real user input (the spike uses authored coordinates).
- Single-file worker inlining for `pdf.js` (blob URL) — validated when the single-file build lands.
