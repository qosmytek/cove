# ADR-0007 · Video engine: WebCodecs fast path with an `ffmpeg.wasm` fallback

> **Status:** Accepted · **Date:** 2026-06-07 · **Owner:** Victor Senna Seleimend · ← [ADR index](./README.md)

## Context
The flagship is a video compressor. [ADR-0001](./0001-wasm-compute-engines.md) chose WebAssembly
(`ffmpeg.wasm`) for on-device compute and [ADR-0006](./0006-ffmpeg-build-and-threading.md) pinned its
build/threading. The
[Phase 0 prototype](../../product/roadmap.md#phase-0--riskiest-first-prototype-starting-2026-06)
benchmarked both engines on the reference-device proxy (6× CPU throttle, ~50 s 1080p H.264):

- **`ffmpeg.wasm`** (software, `faster` preset): **~200 s** encode (~4× slower than real-time) —
  decode + encode-bound; cannot be "fast" for 1080p on a mid-range phone.
- **WebCodecs** (device hardware codecs): **~22 s** encode (~0.4× real-time), essentially unchanged
  under throttle — the signature of genuine **hardware** acceleration. H.264 encode/decode is confirmed
  available on the reference device (A54).

So software WASM meets the privacy/portability goals but not "fast"; the hardware path does both.

## Decision
Make **WebCodecs (`VideoDecoder`/`VideoEncoder`, hardware H.264) the primary fast path** for the video
compressor, with **`ffmpeg.wasm` ([ADR-0006](./0006-ffmpeg-build-and-threading.md)) as the universal
fallback** — for browsers/devices lacking WebCodecs or the needed hardware codec, and for formats
WebCodecs doesn't cover. Choose between them by **capability detection**
(`VideoEncoder.isConfigSupported`), consistent with our
[progressive-enhancement](../../quality/progressive-enhancement.md) principle. Both run entirely
on-device with zero egress.

## Consequences
- ✅ Real-time-class 1080p compression on a mid-range phone — meets the headline "fast" promise.
- ✅ Universal coverage retained through the `ffmpeg.wasm` fallback.
- ⚠️ Two engines to build and maintain. The WebCodecs path needs manual demux/mux (mp4box / mp4-muxer),
  **audio** handling, **bitrate/quality** control, and **memory/streaming** for large inputs — Phase 1 work.
- ⚠️ `isConfigSupported` reports capability, not guaranteed hardware use; confirm by benchmark.
- 🔗 Realized by [Local-First Core](../../features/01-local-first-core.md) / the v1 compressor. Does not
  supersede [ADR-0006](./0006-ffmpeg-build-and-threading.md), which still governs the fallback engine.
