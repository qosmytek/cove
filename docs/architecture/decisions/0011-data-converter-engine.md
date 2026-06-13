# ADR-0011 · Data converter engine: DuckDB-WASM for CSV ↔ JSON ↔ Parquet

> **Status:** Accepted · **Date:** 2026-06-11 · **Owner:** Victor Senna Seleimend · ← [ADR index](./README.md)

## Context
Phase 3's second tool is the [data converter](../../features/10-data-converter.md) ("Cove Convert") —
convert between **CSV, JSON, and Parquet** entirely on-device, and serve as the **on-ramp** to
[on-device analytical SQL](../../features/05-big-data-exploration.md). It must read and write all three
formats, handle large files without exhausting memory, run off the main thread, and never upload a
user's local file (zero egress).

Options weighed:
- **DuckDB-WASM** — a columnar analytical engine that natively reads/writes CSV, JSON, and Parquet
  (`read_csv` / `read_json` / `read_parquet` + `COPY … TO`), streams/spills for large inputs, and runs
  in a worker. It is also the engine [feature 05](../../features/05-big-data-exploration.md) needs, so
  the converter is a genuine on-ramp, not throwaway. Cost: a multi-MB WASM bundle.
- **Lighter pure-JS/WASM libs** (e.g. `papaparse` + a JS Parquet reader/writer) — lighter and possibly
  single-file-able, but Parquet-in-JS is less mature, it is three libraries to stitch, and it leads
  nowhere near feature 05's SQL.

## Decision
Use **DuckDB-WASM** as the converter's engine, in a [Web Worker](./0002-web-workers-for-compute.md):
read the local file with `read_csv` / `read_json` / `read_parquet` (auto-detected) and write the target
with `COPY … TO` (CSV / JSON / Parquet). Local files are read via the
[FS Access API / OPFS](./0003-opfs-and-fs-access-api.md) and the output saved the same way (download
fallback) — **no network for local conversion**. Vendor the DuckDB-WASM bundle **same-origin** (like the
ffmpeg cores) so it loads under COEP with zero egress, and **lazy-load it behind intent** with its size
disclosed (R1). A **riskiest-first spike** proves an in-browser CSV → Parquet → CSV/JSON round-trip
before any UI.

## Consequences
- ✅ One robust engine for all three formats and for large files; the converter doubles as the
  **on-ramp** to [feature 05](../../features/05-big-data-exploration.md)'s analytical SQL.
- ✅ Zero egress for local-file conversion; runs in a worker (60fps main thread); `SharedArrayBuffer`
  accelerates it where cross-origin isolation is available, with a single-threaded fallback.
- ⚠️ **Payload (R1)** — DuckDB-WASM is **~35 MB uncompressed (≈7.7 MB gzipped)**, ffmpeg-class
  (measured in the [spike](../../engineering/phase-3-converter-spike.md)); lazy- and intent-gated with
  its size disclosed, cached on first use. **Too heavy to inline, so Cove Convert is *not* a single-file
  target** ([ADR-0004](./0004-single-file-build-target.md)); it is hosted-PWA-only for v1.
- ⚠️ **Conversion fidelity (R11)** — type inference and precision (CSV → typed columns, integer width,
  timestamps, JSON nesting) can silently lose or coerce data; pin sensible defaults and verify
  round-trips.
- ⚠️ Memory on very large inputs (R9) — DuckDB streams/spills via OPFS, but cap with a clear message.
- 🔗 Realizes [Data Converter](../../features/10-data-converter.md); sets up
  [Big-Data Exploration](../../features/05-big-data-exploration.md).
