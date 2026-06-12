# 09 · PDF Redactor

> **Status:** Draft · **Last updated:** 2026-06-10 · **Owner:** Victor Senna Seleimend
> **Section:** [Features](./README.md) · **In v1:** ⏳ Phase 3 (lead tool) · **Brand:** Cove Redact
> ← [Feature index](./README.md)

## Summary
Permanently remove sensitive content from a PDF — text, images, and the surrounding metadata —
entirely on-device. The output is a new PDF in which the redacted content is **destroyed**, not hidden
under a black box that can be lifted off.

## User value
[Dr. Lee](../product/personas.md) (the regulated-data worker) can redact a confidential PDF and
**truthfully attest it never touched a third party** — and that the blacked-out content is genuinely
gone, not recoverable by copy-paste or by deleting an annotation. Priya gets the same for client
documents. Because its engine is light, Redact is also the **first
[single-file](./02-single-file-app.md) build** — the air-gapped operator can carry it on a USB stick.

## How we build it
Strategy: **rasterize-and-rebuild**
([ADR-0010](../architecture/decisions/0010-pdf-redaction-engine.md)) — provable removal by construction,
with permissively-licensed libraries.
- **Render** pages with `pdf.js` in a [worker](./01-local-first-core.md); the user marks regions to
  redact (drag rectangles; keyboard-operable).
- **Rebuild, don't overlay:** for each page that has a redaction, composite the opaque marks onto the
  rendered raster and embed that flattened image as the page in a **newly created** `pdf-lib` document;
  copy untouched pages unchanged. A rasterized region carries no text, vector, or image objects — so
  there is nothing to recover.
- **Scrub the rest:** rebuilding into a fresh document drops prior revisions / incremental-update
  history, scripts, and attachments; **strip metadata** (info + XMP) by default, with disclosure.
- All in-browser, zero egress; **save** via the File System Access API (download fallback).

## What to watch out for
- **The headline failure mode (risk [R10](../reference/risks.md)):** a black rectangle over
  still-selectable text, or an image still embedded in the file — the content is trivially recovered.
  Rasterize-and-rebuild defeats this by construction; tests still **verify** no marked text survives.
- **v1 trade-off — redacted pages lose their text layer:** a page with a redaction becomes an image
  (no selectable/searchable text, larger bytes); untouched pages keep their text. Text-preserving
  redaction is deferred (see Open questions / [ADR-0010](../architecture/decisions/0010-pdf-redaction-engine.md)).
- **Untouched pages are copied verbatim:** the user must redact everything sensitive — we don't
  auto-detect hidden content on unmarked pages.
- **Payload weight (R1):** `pdf.js` + `pdf-lib` are lazy- and intent-gated like every engine — JS-only
  and far lighter than ffmpeg, which is why Redact pioneers the single-file build.

## Requirements
- **RD-1** Render a PDF and let the user mark regions to redact; fully keyboard-operable.
- **RD-2** Produce an output where redacted content is **removed/destroyed**, not visually covered.
- **RD-3** Strip document metadata by default (with disclosure; allow opting to keep).
- **RD-4** Transmit no file bytes (inherits [LC-1](./01-local-first-core.md) / FR-P1); work offline.
- **RD-5** Save via the File System Access API with a download fallback.
- **RD-6** **Assert** in tests that no marked text or image data is extractable from the output.
- **RD-7** Emit a freshly rebuilt PDF — no incremental-update history, scripts, or attachments carried
  over from the source.

## Capability detection & fallback
Canvas + worker rendering is broadly available; use the FS Access API with an `<input>` + download
fallback. Redact is the **first `file://` single-file target**
([ADR-0004](../architecture/decisions/0004-single-file-build-target.md)): it needs **no
`SharedArrayBuffer`**, so it degrades cleanly where cross-origin isolation is absent. For the
single-file build, `pdf.js`'s worker is inlined (blob URL) or run worker-less. See
[Progressive Enhancement](../quality/progressive-enhancement.md).

## Acceptance criteria
- [ ] A redacted region's text is **not** extractable (copy-paste / text search) in the output, and
  covered images are absent — verified by inspecting the output PDF.
- [ ] Document metadata is stripped by default; no scripts/attachments carry over.
- [ ] Redaction completes **offline** with zero network requests (verify in DevTools).
- [ ] Runs as a single self-contained `.html` from a USB stick (ties off
  [SF-1/SF-2](./02-single-file-app.md)).

## Dependencies
[Local-First Core](./01-local-first-core.md) · [Single-File App](./02-single-file-app.md) (Redact is its
first realization) · [Command Palette](./08-command-palette.md) ·
[Tech Stack](../architecture/tech-stack.md) ·
[ADR-0010](../architecture/decisions/0010-pdf-redaction-engine.md) ·
[ADR-0004](../architecture/decisions/0004-single-file-build-target.md).

## Decided (2026-06-10)
Engine & strategy resolved in [ADR-0010](../architecture/decisions/0010-pdf-redaction-engine.md):
rasterize-and-rebuild with `pdf.js` + `pdf-lib` (permissive licenses; MuPDF's AGPL path declined),
redacted pages rasterized, output rebuilt fresh, and the single-file engine **inlined**. A
riskiest-first spike validates true removal before UI, mirroring Phase 0.

## Build status (2026-06-10)
v1 ships behind the [tool contract](../engineering/adding-a-tool.md): `pdf.js` rendering (with the
base-14 standard fonts vendored **same-origin** for fidelity — zero egress, fetched only when a PDF
needs them); region marking by mouse (drag) **or keyboard** — “Add box”, then arrow keys to move,
Shift+arrows to resize, Delete to remove (**RD-1**) — plus a “Redact entire page” toggle; the DOM-free
rebuild core (`src/redaction.ts`, unit-tested for RD-2/RD-6, with `nudgeBox` covering the keyboard
geometry); File System Access save (RD-5); and ⌘K navigation between tools. A **single-file** build
(`npm run build:single` → `dist-single/redact.html`, [ADR-0004](../architecture/decisions/0004-single-file-build-target.md))
inlines everything for `file://` use; standard fonts are omitted there. CI-green (core tests + typecheck
+ build + size; the heavy `pdf.js` bundle is lazy and excluded from the precache). The marking UI and a
`file://` run of the single-file build are **manually verified** (zero egress; opening from `file://`
logs a non-fatal cross-origin **error** during pdf.js worker setup — see
[feature 02](./02-single-file-app.md)). An **e2e** covers the load → mark → redact → save flow in a real
browser, and CI builds the single file (`build:single`) and asserts it stays self-contained.

## Open questions
- **Text-preserving redaction** (keep a searchable layer on redacted pages) — revisit MuPDF-WASM *iff*
  licensing clears, or a permissive content-aware path matures.
- **OCR the rasterized pages** to restore searchability without re-exposing redacted content?
- **Form / annotation-aware** redaction (fields, comments) beyond rectangular regions.
