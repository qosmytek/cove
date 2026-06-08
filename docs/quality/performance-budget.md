# Performance Budget

> **Status:** Stable (budget ratified 2026-06-06; peak-memory added 2026-06-08) · **Last updated:** 2026-06-08 · **Owner:** Victor Senna Seleimend
> **Section:** [Quality](./) · ← [Documentation Index](../README.md)

**This is the most important quality document.** Payload weight is the #1 risk to the product
([Risks](../reference/risks.md)): a "fast" tool that ships 3 MB of JavaScript isn't fast. WASM engines
and AI weights can dwarf the app, so we budget bytes like money and **enforce the budget in CI**.

## The five rules (from the brief)
1. **Lazy-load** heavy engines/weights **behind explicit user intent** — never in the initial payload.
2. **Cache aggressively** so the first load is the only slow load.
3. **Capability-detect** (WebGPU, SharedArrayBuffer, OPFS) and pick the lightest viable path.
4. **Always keep a lighter fallback.**
5. **Measure on a real mid-range phone**, not a laptop.

## Budgets (ratified 2026-06-06)
> **Decided** by Victor Senna Seleimend on 2026-06-06. These are committed budgets, measured against the
> [reference device](../engineering/testing-strategy.md#device--browser-matrix) (Samsung Galaxy A54 5G)
> and the CI mobile proxy. Changing any number requires an
> [ADR](../architecture/decisions/README.md) — never a silent regression.

| Metric | Budget | Notes |
| ------ | ------ | ----- |
| Initial JS (compressed) | **≤ 150 KB** | Shell only; no engine. |
| Initial total transfer (compressed) | **≤ 250 KB** | HTML + CSS + JS + icons. |
| Web fonts | **0 KB** | System fonts only ([Calm by Design](../features/07-calm-design.md)). |
| Third-party scripts | **0** | None, ever. |
| Time to Interactive (mid-range phone, cold) | **≤ 3 s** | Shell usable before any engine. |
| Largest Contentful Paint (LCP) | **≤ 2.5 s** | Core Web Vital; mid-range, Slow 4G. |
| Total Blocking Time (TBT) | **≤ 200 ms** | Interactivity proxy; main thread kept clear. |
| Cumulative Layout Shift (CLS) | **≤ 0.1** | Visual stability. |
| Main-thread long tasks during compute | **≈ 0** | Compute is in [workers](../architecture/decisions/0002-web-workers-for-compute.md). |
| Heavy engine in initial payload | **0 bytes** | Always lazy + intent-gated. |

## Lazy-loaded assets (disclosed, not counted in initial load)
These are large by nature; the rule is **disclose the size and load only on intent**, then cache.

| Asset | Rough order of magnitude | Rule |
| ----- | ------------------------ | ---- |
| WebCodecs (fast path) | ~0 (built-in OS codecs) | No download; used when hardware H.264 is available. |
| `ffmpeg.wasm` core (fallback) | tens of MB | Loaded only when WebCodecs isn't available; show size first. |
| AI model weights | hundreds of MB | Phase 4; explicit opt-in + size disclosure; cache after first load. |

## Compute performance (the v1 compressor)
Ratified 2026-06-07 from the
[Phase 0 outcome](../product/roadmap.md#phase-0--riskiest-first-prototype-starting-2026-06):
- **WebCodecs fast path — gated target:** compress a representative ~1-minute 1080p H.264 clip on the
  [reference device](../engineering/testing-strategy.md#device--browser-matrix) at **≈ real-time or
  faster** (Phase 0 proxy: ~22 s for a ~50 s clip).
- **`ffmpeg.wasm` fallback — best-effort, not gated:** must complete **without OOM**, with progress and
  a working cancel; it is materially slower (~4× real-time on the proxy) and is the compatibility path,
  not the performance target.
- **Memory (peak JS heap):** for the reference **~1-minute 1080p→720p** clip on the WebCodecs path,
  **≤ 400 MB** (measured ~238 MB at Stage 3 after bounding the decode/encode pipeline; the headroom
  covers run-to-run / GC variance and device differences, and stays well clear of the pre-fix ~595 MB
  regression). `performance.memory` is a coarse JS-heap proxy, so the **binding check is no-OOM on the
  [A54](../engineering/testing-strategy.md#device--browser-matrix)**. Peak scales as **≈ input size + a
  bounded (~150 MB) pipeline**, because the input is held whole until **Stage 4** streams it (range reads from the `File`; no OPFS) —
  very large inputs will exceed this until then. Changing this number requires an
  [ADR](../architecture/decisions/README.md).

## Enforcement in CI
- **Bundle-size gate:** fail the build if initial JS/total exceeds budget (e.g., size-limit / bundlesize).
- **Lighthouse CI** (or equivalent) with performance assertions on a throttled, mid-range profile.
- **"No engine in initial payload" assertion:** verify heavy WASM is not referenced by the entry chunk.
- See [CI/CD](../engineering/ci-cd.md) — budgets are **blocking** gates.

## When the budget and a feature conflict
The budget wins by default. Exceeding it requires an explicit, recorded decision (an
[ADR](../architecture/decisions/README.md)) — never a silent regression.

See also: [Progressive Enhancement](./progressive-enhancement.md) · [Risks](../reference/risks.md) ·
[Local-First Core](../features/01-local-first-core.md)
