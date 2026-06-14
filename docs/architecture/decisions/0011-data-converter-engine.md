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
fallback) — **no network for local conversion**.

Ship the **single-threaded `eh`** build, vendored **same-origin** (like the ffmpeg cores), lazy-loaded
behind intent with its size disclosed (R1). JSON and Parquet are **DuckDB extensions**, not in the core
wasm; DuckDB autoloads them from a CDN by default, so we **vendor the `json`/`parquet` extensions
same-origin too** and point DuckDB at them (`SET custom_extension_repository`) — **zero egress, works
offline**. Two **riskiest-first spikes** proved an in-browser CSV → Parquet → CSV/JSON round-trip, and
that the self-hosted extensions load with no CDN call, before any UI.

## Consequences
- ✅ One robust engine for all three formats and for large files; the converter doubles as the
  **on-ramp** to [feature 05](../../features/05-big-data-exploration.md)'s analytical SQL.
- ✅ **Zero egress, even for extensions** — engine and the `json`/`parquet` extensions are vendored
  same-origin and loaded via `custom_extension_repository`, so a conversion makes **no third-party
  request** and works offline (validated in the [spike](../../engineering/phase-3-converter-spike.md)).
  DuckDB's default CDN extension autoload would have broken the local-first promise.
- ✅ Runs in a [Web Worker](./0002-web-workers-for-compute.md), so the main thread stays responsive.
- ⚙️ **Single-threaded `eh`, not multi-threaded `coi`** — the `coi` build can't link the extensions
  (the `wasm_threads` variant fails with a shared-memory mismatch) and the converter needs them, so we
  force `eh`. The block is a tracked upstream bug ([duckdb-wasm#1916](https://github.com/duckdb/duckdb-wasm/issues/1916));
  worker-thread parallelism (`coi`) — and how to unblock it — is parked in the
  [backlog](../../product/backlog.md), gated on a measured need (likely [feature 05](../../features/05-big-data-exploration.md)).
- ⚠️ **Payload (R1)** — the `eh` engine is **~35 MB uncompressed (≈7.7 MB gzipped)**, ffmpeg-class
  (measured in the [spike](../../engineering/phase-3-converter-spike.md)); the `json` + `parquet`
  extensions add **~4 MB**, fetched lazily on the first JSON/Parquet convert. All vendored same-origin,
  lazy- and intent-gated, size disclosed, cached on first use. **Too heavy to inline, so Cove Convert
  is *not* a single-file target** ([ADR-0004](./0004-single-file-build-target.md)); hosted-PWA-only for v1.
- ⚠️ **Conversion fidelity (R11)** — type inference and precision (CSV → typed columns, integer width,
  timestamps, JSON nesting) can silently lose or coerce data; pin sensible defaults and verify
  round-trips.
- ⚠️ Memory on very large inputs (R9) — DuckDB streams/spills via OPFS, but cap with a clear message.
- 🔗 Realizes [Data Converter](../../features/10-data-converter.md); sets up
  [Big-Data Exploration](../../features/05-big-data-exploration.md).
