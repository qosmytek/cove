# Backlog (post-Phase-4)

> **Status:** Living · **Last updated:** 2026-06-14 · **Owner:** Victor Senna Seleimend
> **Section:** [Product](./) · ← [Documentation Index](../README.md)

Understood-but-deliberately-unscheduled work. Each entry records the idea, why it's parked, and what it
would take. Nothing here is required for v1; these are revisited **after Phase 4**.

## Large outputs

The compressor buffers the **entire compressed output in memory** before saving (WebCodecs
`ArrayBufferTarget` / ffmpeg MEMFS), so an output large enough to exceed the heap budget will fail.
Input is already streamed and bounded on both paths — the output is the remaining ceiling. Output size
scales with duration × bitrate.

- **Stream the WebCodecs output to disk** — *buildable now; deferred post-Phase-4.* Use mp4-muxer's
  `FileSystemWritableFileStreamTarget` + `fastStart: false` to write the output to a File System Access
  handle as it's produced, instead of buffering it — so peak memory no longer scales with output size.
  Covers the **H.264/MP4** (primary) path; no custom core needed. Cost: a ~5-file change, a
  "pick destination first" UX flow, and abort-on-failure cleanup.
- **Custom OPFS ffmpeg core** — *deferred post-Phase-4; needs an external build.* The stock
  `@ffmpeg/core` exposes no OPFS mount, so the ffmpeg fallback's output sits in the WASM heap, capping
  **non-H.264** outputs. A WASMFS+OPFS core would lift that, but requires a custom emscripten build
  (Docker + emsdk, multi-hour, ongoing maintenance) on a dedicated build host, plus adapting the
  `@ffmpeg/ffmpeg` wrapper. WORKERFS already keeps the *input* off the heap
  ([ADR-0003](../architecture/decisions/0003-opfs-and-fs-access-api.md)).

## WebCodecs audio decode + re-encode

*Deferred post-Phase-4.* The WebCodecs path currently **passes AAC-LC audio through** and falls back to
ffmpeg for any other audio codec (Opus, MP3, HE-AAC, …). A future enhancement: in the WebCodecs worker,
**decode non-AAC audio (`AudioDecoder`) and re-encode it to AAC (`AudioEncoder`)**, muxed in sync with
the re-encoded video — so non-AAC-audio MP4s stay on the fast hardware path instead of dropping to the
slower ffmpeg fallback.

## Multi-threaded DuckDB (`coi`)

[Cove Convert](../features/10-data-converter.md) runs on the **single-threaded `eh`** DuckDB-WASM build.
The multi-threaded **`coi`** build is blocked from loading the `json`/`parquet` extensions the data tools
need: its shared-memory runtime (`-pthread -sSHARED_MEMORY=1`) rejects the published extension binaries,
which declare a *non-shared* memory import — `LinkError: … mismatch in shared state of memory,
declared = 0, imported = 1`. This is a tracked upstream bug on DuckDB's **experimental** COI variant
([duckdb-wasm#1916]); forcing `eh` is the working path
([ADR-0011](../architecture/decisions/0011-data-converter-engine.md),
[converter spike](../engineering/phase-3-converter-spike.md)).

**Gate first.** There's *no measured evidence* multi-threading helps here. Its win is **parallel query
execution** (scans / joins / aggregations) — [feature 05](../features/05-big-data-exploration.md)'s
analytical SQL — not single-pass, I/O-bound *format conversion*. Revisit only when a **profiled** workload
shows a real gain, most likely under feature 05.

**Plan: static-link now, drop it on the upstream fix.**
- **Preferred mitigation — static-link the extensions into a custom `coi` build.** Compile
  `json`/`parquet` *into* a custom DuckDB-WASM `coi` bundle, so there are no separately-loaded extensions
  and the memory-model mismatch can't arise. One self-contained artifact, no extension signing or repo.
  Cost: an external Emscripten/DuckDB engine build (Docker + emsdk, ongoing maintenance) on a dedicated
  build host, rebuilt on each version bump — the same class of work as the custom OPFS ffmpeg core above.
- **Ultimate path — the upstream fix.** When [duckdb-wasm#1916] ships COI-built (shared-memory)
  extensions, retire the custom engine: vendor the official `wasm_threads` variant, flip the bundle back
  to `coi` via `selectBundle`, and reuse the same-origin self-host pattern. Lowest long-term cost — so we
  only static-link if a measured need arrives before the fix lands.

[duckdb-wasm#1916]: https://github.com/duckdb/duckdb-wasm/issues/1916

See also: [Roadmap](./roadmap.md) · [Performance Budget](../quality/performance-budget.md)
