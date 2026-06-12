# 10 · Data Converter

> **Status:** Draft · **Last updated:** 2026-06-11 · **Owner:** Victor Senna Seleimend
> **Section:** [Features](./README.md) · **In v1:** ⏳ Phase 3 · **Brand:** Cove Convert
> ← [Feature index](./README.md)

## Summary
Convert a data file between **CSV, JSON, and Parquet** entirely on-device with **DuckDB-WASM** — a local
file goes in, a converted file comes out, and **nothing is uploaded**. It is also the on-ramp to
on-device analytical SQL ([feature 05](./05-big-data-exploration.md)).

## User value
[Sam](../product/personas.md) (the data power user) — and anyone handed a dataset in the wrong format —
converts it without pasting confidential data into a sketchy online converter. The same engine, later,
runs real SQL over it.

## How we build it
- **DuckDB-WASM** in a [worker](./01-local-first-core.md)
  ([ADR-0011](../architecture/decisions/0011-data-converter-engine.md)).
- Read the local file with `read_csv` / `read_json` / `read_parquet`; write the chosen target with
  `COPY … TO` (CSV / JSON / Parquet).
- Local file I/O via the **File System Access API / OPFS**; **save** the result the same way (download
  fallback). No network for local conversion.
- The DuckDB-WASM bundle is vendored **same-origin** and **lazy-loaded on intent**, its size disclosed.

## What to watch out for
- **Conversion fidelity (risk [R11](../reference/risks.md)):** type inference and precision — CSV has no
  types, integer widths and timestamps can coerce, JSON nesting vs. flat columns. Pick sensible
  defaults, disclose them, and **verify round-trips** in tests.
- **Payload (R1):** DuckDB-WASM is several MB — lazy + intent-gated like every engine. Too heavy to
  inline, so this tool is **not** a single-file build (hosted PWA only).
- **Memory (R9):** very large files — DuckDB streams/spills via OPFS, but cap with a clear message.
- **Privacy:** local-file conversion touches **no network**. (Remote-data querying is
  [feature 05](./05-big-data-exploration.md), not this tool.)

## Requirements
- **DC-1** Convert between any pairing of CSV, JSON, and Parquet.
- **DC-2** Read local files with no upload; conversion is zero-egress.
- **DC-3** Run conversion in a worker; the main thread stays responsive (FR-P3).
- **DC-4** Save via the File System Access API with a download fallback (FR-V5).
- **DC-5** Handle large files via streaming/spill and degrade gracefully with honest limits (FR-V7).
- **DC-6** Lazy-load DuckDB-WASM behind intent; disclose its size first (FR-P2).
- **DC-7** **Verify round-trips** in tests (e.g. CSV → Parquet → CSV preserves rows and values).

## Capability detection & fallback
Best with `SharedArrayBuffer` (cross-origin isolation) for multi-threaded DuckDB; fall back to
single-threaded. File System Access API with `<input>` + download fallback. See
[Progressive Enhancement](../quality/progressive-enhancement.md).

## Acceptance criteria
- [ ] A CSV → Parquet → CSV round-trip preserves rows and values.
- [ ] Converting a local file makes **zero** network requests (verify in DevTools).
- [ ] A large file converts without OOM, or fails with a clear, honest message.

## Dependencies
[Local-First Core](./01-local-first-core.md) · [Tech Stack](../architecture/tech-stack.md) ·
[ADR-0011](../architecture/decisions/0011-data-converter-engine.md) ·
[Command Palette](./08-command-palette.md) · on-ramp to
[Big-Data Exploration](./05-big-data-exploration.md).

## Open questions
- Default CSV type inference (and an override UI)?
- The streaming/spill threshold + memory cap on the reference device (shared with feature 05).
- Expose a tiny SQL preview now (a step toward feature 05), or keep v1 pure conversion?
