# Phase 0 — Running & Measuring the Compressor Spike

> **Status:** Draft · **Last updated:** 2026-06-06 · **Owner:** Victor Senna Seleimend
> **Section:** [Engineering](./) · ← [Documentation Index](../README.md)

How to run the Phase 0 prototype and take the measurements that decide the
[Phase 0 go/no-go](../product/roadmap.md#phase-0--riskiest-first-prototype-starting-2026-06). The engine
build/threading is [ADR-0006](../architecture/decisions/0006-ffmpeg-build-and-threading.md).

## Run it locally
Prerequisites: **Node 18+** (scaffolded on Node 26 via nvm).

```
npm install
npm run dev        # serves with COOP/COEP at http://localhost:5173
```

Open the URL in **Chrome/Edge**, pick a video, click **Compress**. `npm run build && npm run preview`
serves the production build the same way.

> **npm 11 note:** npm 11 may skip dependencies' install scripts, leaving esbuild (Vite's bundler)
> without its binary. If a build fails to find esbuild, run `node node_modules/esbuild/install.js` once
> (or approve install scripts), then retry. `npm run copy-core` — run automatically by `dev`/`build` —
> vendors the ffmpeg cores into `public/ffmpeg/` so they load same-origin under COEP.

## Desktop sanity check
- Status line reads `crossOriginIsolated: true` and `engine: multi-threaded`.
- The engine chunk and core are fetched **only after** clicking Compress (DevTools → Network).
- **No request carries the input file's bytes** — only same-origin asset/core fetches.
- A smaller `.mp4` is produced and downloadable.

## Engines (ffmpeg.wasm vs WebCodecs)
The shell has an **Engine** selector:
- **ffmpeg.wasm** — the universal, proven path (any codec, but a slow software transcode).
- **WebCodecs (hardware)** — the fast-path spike: demux → `VideoDecoder` → downscale → `VideoEncoder` →
  mux. **Video-only** (audio is dropped) and it targets a **bitrate** (the preset/CRF knobs don't apply).

Benchmark by running the **same clip** through each engine and comparing the **encode** time.

## Measure on the reference device (the real go/no-go)
Target: **Samsung Galaxy A54 5G**, a representative **~60 s 1080p H.264** clip.

1. Serve the build somewhere the phone can reach **with COOP/COEP over a secure context**. Cross-origin
   isolation needs HTTPS; `localhost` is exempt but a LAN IP is not, so use HTTPS (or Chrome's
   treat-as-secure flag) for the device test.
2. On the phone (Chrome), connect to your laptop and use **`chrome://inspect`** to watch console/network.
3. Confirm `crossOriginIsolated === true` and the multi-threaded path is active.
4. Run the compression and record (all logged): **encode time** — the log separates the one-time engine
   load from encode, so use the encode figure — **peak memory / any OOM** (watch for crashes/reloads;
   `performance.memory` is coarse, so cross-check Chrome's task manager), and **size reduction**.
5. **Force the single-threaded fallback** once (serve without COOP/COEP, or any context lacking
   `SharedArrayBuffer`) and confirm it still completes — exercising the ADR-0006 fallback.

## Pass / fail (provisional)
Provisional pass = completes on the A54 **without OOM** and yields a **meaningfully smaller** file
(≥ ~50% at comparable quality). The first run **sets** the time and peak-memory thresholds — record them
and ratify into the [performance budget](../quality/performance-budget.md), per the
[roadmap Phase 0 bar](../product/roadmap.md#phase-0--riskiest-first-prototype-starting-2026-06).

## Scope
Throwaway-grade UI with basic **preset / CRF / height** knobs for measurement (defaults `veryfast`,
CRF 28, 720p). Polished presets/target-size mode, FS Access API save, OPFS scratch, the offline PWA, and
the command palette are Phase 1 — see [Scope](../product/scope.md).
