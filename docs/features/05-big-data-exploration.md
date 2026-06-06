# 05 · Big-Data Exploration

> **Status:** Draft · **Last updated:** 2026-06-06 · **Owner:** Victor Senna Seleimend
> **Section:** [Features](./README.md) · **Source idea:** (22) · **In v1:** ⏳ Phase 3
> ← [Feature index](./README.md)

## Summary
Let users run real analytical SQL over **millions of rows** with **DuckDB-WASM**, querying **Parquet**
via **HTTP range requests** so only the bytes a query needs are fetched. The "backend" is simply the
user's own CPU.

## User value
Sam (the data power user) gets notebook-grade analysis with no server, no upload, and no setup — point
at a Parquet file and query.

## How we build it
- **DuckDB-WASM** as the engine, in a [worker](./01-local-first-core.md).
- Query **Parquet** directly; use **HTTP range requests** to fetch only the needed byte ranges of
  *remote* files. Local files are read via the FS Access API / OPFS.
- Surface results through the [command palette](./08-command-palette.md) and a results grid.

## What to watch out for
- **Memory** is the constraint on large datasets — prefer columnar Parquet, push down filters, and
  stream results.
- Range-request querying touches the network for a *remote data file's* bytes — never for user-provided
  local files. Make that distinction explicit so the privacy story stays clear.

## Requirements
- **BD-1** Run analytical SQL over large datasets via DuckDB-WASM in a worker.
- **BD-2** Read local files with no upload; for remote Parquet, fetch only required byte ranges.
- **BD-3** Keep the UI responsive on multi-million-row queries.
- **BD-4** Never transmit the contents of user-provided local files.

## Capability detection & fallback
Best with `SharedArrayBuffer` (cross-origin isolation); fall back to single-threaded DuckDB-WASM. Cap
dataset size with a clear message when memory is insufficient.

## Acceptance criteria
- [ ] A multi-million-row Parquet query returns correct results with no server.
- [ ] Remote Parquet queries fetch only needed ranges (verify in DevTools); local files never upload.

## Dependencies
[Local-First Core](./01-local-first-core.md) · [Tech Stack](../architecture/tech-stack.md) ·
[Command Palette](./08-command-palette.md).

## Open questions
- Ship the CSV ↔ JSON ↔ Parquet **converter** first as the on-ramp to this feature?
- Default memory ceiling and paging strategy on the reference device?
