# ADR-0003 · Use OPFS + File System Access API for files

> **Status:** Accepted · **Date:** 2026-06-06 · **Owner:** Victor Senna Seleimend · ← [ADR index](./README.md)

## Context
We need to read user files and write results **without uploading**, and we need fast scratch space for
large media without exhausting the JS heap.

## Decision
Use the **File System Access API** to read inputs and save outputs directly to the user's disk, and
**OPFS** (Origin Private File System) as fast, sandboxed scratch space during processing. Where the FS
Access API is unsupported, fall back to `<input type="file">` for input and a browser **download** for
output.

## Consequences
- ✅ No upload; bytes stay local. Save-in-place UX on supported browsers.
- ✅ OPFS scratch handles large files far better than in-memory buffers.
- ⚠️ FS Access API support varies → the fallback path is required (and must be tested).
- 🔗 Detailed in [Data Flow](../data-flow.md); realized by
  [Local-First Core](../../features/01-local-first-core.md).
