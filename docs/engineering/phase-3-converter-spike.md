# Phase 3 — Data Converter Spike (DuckDB-WASM round-trip)

> **Status:** Draft · **Last updated:** 2026-06-11 · **Owner:** Victor Senna Seleimend
> **Section:** [Engineering](./) · ← [Documentation Index](../README.md)

The riskiest-first spike for the [data converter](../features/10-data-converter.md) ("Cove Convert"),
validating [ADR-0011](../architecture/decisions/0011-data-converter-engine.md) **before any UI** — the
converter's equivalent of the [Phase 0](./phase-0-measurement.md) and
[redaction](./phase-3-redaction-spike.md) spikes. Risk retired: **does DuckDB-WASM round-trip data
between CSV, JSON, and Parquet without losing or corrupting it** (risk [R11](../reference/risks.md))?

## What it proves
A CSV (mixed types + a quoted field containing a comma) is read with auto type-detection, written to
Parquet, read back, and exported to CSV and JSON. The round-tripped table must equal the original
exactly.

## Method (headless Node proxy)
The browser tool will drive **AsyncDuckDB in a Web Worker**; the spike runs DuckDB-WASM's synchronous
**Node "blocking" API** (`@duckdb/duckdb-wasm/blocking`, no worker) — the engine and SQL
(`read_csv` / `COPY … TO` / `read_parquet`) are identical, which is what R11 is about. Installed with
`npm install --no-save @duckdb/duckdb-wasm`. The prototype is `spike/convert-spike.mjs` (gitignored,
like the Phase 0 / redaction prototypes); run it with `node spike/convert-spike.mjs`.

## Outcome (2026-06-11): PASS
- **Lossless round-trip:** CSV → Parquet → table preserves every row (symmetric difference = 0); row
  count preserved.
- **Type inference:** `id` BIGINT, `score` DOUBLE, `active` BOOLEAN, `joined` DATE, `name` VARCHAR.
- **CSV edge case:** the quoted comma field (`"Carol, Jr."`) survives the round-trip.
- **All three writers work:** Parquet, CSV (with header), and JSON (an array of objects, typed values
  intact, e.g. `score: 8.25`).

## Engine size (R1)
`duckdb-eh.wasm` is **~35 MB uncompressed, ≈7.7 MB gzipped** — ffmpeg-class. So the engine is **lazy- and
intent-gated** with its size disclosed, cached on first use, and **too heavy to inline**: Cove Convert is
hosted-PWA-only, **not** a single-file target
([ADR-0011](../architecture/decisions/0011-data-converter-engine.md)).

## What this green-lights — and one integration risk to watch
Build the converter (`src/tools/convert.ts`) on this pipeline, behind the
[tool contract](./adding-a-tool.md), with a round-trip assertion as a permanent **DC-7** test.
**Watch:** the in-browser path uses **AsyncDuckDB in a Web Worker**, so that worker + Vite bundling + the
35 MB WASM + COEP-for-`SharedArrayBuffer` is the integration risk. The DuckDB worker *hung* under the
Node `web-worker` shim here — a Node-shim issue, not a browser one — but it flags that the worker wiring
needs care early, the way pdf.js's worker did.
