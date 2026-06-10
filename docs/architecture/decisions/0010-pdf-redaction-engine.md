# ADR-0010 · PDF redaction engine & strategy: rasterize-and-rebuild with `pdf.js` + `pdf-lib`

> **Status:** Accepted · **Date:** 2026-06-10 · **Owner:** Victor Senna Seleimend · ← [ADR index](./README.md)

## Context
Phase 3's lead tool is the [PDF redactor](../../features/09-pdf-redactor.md) ("Cove Redact"). Its entire
trust proposition is **provably complete removal**: a redacted region must contain *no recoverable
content* — not a black box drawn over still-selectable text, nor an image still embedded in the file
(risk [R10](../../reference/risks.md)). It runs fully on-device (zero egress) and is also the first
[single-file](../../features/02-single-file-app.md) target, so its engine must be light enough to inline
and must not require `SharedArrayBuffer`.

Two questions had to be settled to start Phase 3 — *how* to redact so removal is provable, and *which
library*, given that the one mature content-aware redaction engine (MuPDF) is **AGPL-3.0 / commercial**,
a poor fit for a product with a paid Pro tier ([Monetization](../../product/monetization.md)). Options:

- **Overlay annotation** (opaque rectangle over the page): trivial, but the content survives underneath
  — *not redaction*. Rejected.
- **Content-stream surgery** (`pdf-lib`-style: delete the text runs / image XObjects under each mark):
  would preserve the text layer, but is fragile across real-world PDFs and unsupported by permissively
  licensed JS libraries.
- **Content-aware engine (MuPDF-WASM):** genuine redaction with text preserved, but **AGPL/commercial**
  and a multi-MB WASM payload that fights the single-file goal.
- **Rasterize-and-rebuild:** render each *redacted* page to a canvas, composite the opaque marks onto
  the pixels, and embed those flattened images as pages in a **freshly created** document — copying
  untouched pages as-is. Removal is **guaranteed by construction** with permissive libraries.

## Decision
Adopt **rasterize-and-rebuild** as the v1 redaction strategy, implemented with **`pdf.js`** (Apache-2.0)
for rendering and **`pdf-lib`** (MIT) for output — both permissively licensed, JS-based, and light
enough to inline for the single-file build:

- Render with `pdf.js`; the user marks rectangular regions.
- For each page **that has a redaction**, composite the opaque marks onto the rendered raster and embed
  that image as the page in a **newly created** `pdf-lib` document; **copy untouched pages unchanged**.
- Building a fresh document **drops document-level residue by construction** — prior revisions /
  incremental-update history, JavaScript, embedded files, and the source metadata/XMP are not carried
  over; we set minimal metadata explicitly.
- **Verify** in tests that no marked text is extractable from the output.
- A **riskiest-first spike** validates true removal on real PDFs *before* UI work, mirroring Phase 0.

## Consequences
- ✅ **Provable removal** — a redacted region carries no text, vector, or image objects, so there is
  nothing to recover; the trust proposition holds by construction.
- ✅ **Bonus scrubbing** — the rebuild discards revision history, scripts, attachments, and source
  metadata for free.
- ✅ **Permissive licensing** (Apache-2.0 / MIT) — no AGPL entanglement with the Pro tier; a light,
  JS-only engine that **inlines** into the single-file build and needs **no `SharedArrayBuffer`** —
  settling the [inline-vs-beside](../../features/02-single-file-app.md) question (inline).
- ⚠️ **A redacted page loses its searchable text layer** (it becomes an image) and grows in size;
  untouched pages keep their text. Text-preserving redaction is **deferred** — revisit MuPDF-WASM *iff*
  its licensing is cleared, or a permissive content-aware path matures.
- ⚠️ `pdf.js` ships a worker and uses `import.meta.url`; the single-file build must inline the worker
  (blob URL) or run worker-less — a known wrinkle, not a blocker.
- 🔗 Realizes [PDF Redactor](../../features/09-pdf-redactor.md) and the first
  [single-file](../../features/02-single-file-app.md) build
  ([ADR-0004](./0004-single-file-build-target.md)); mitigates [R10](../../reference/risks.md).
