# Roadmap

> **Status:** Draft · **Last updated:** 2026-06-06 · **Owner:** Victor Senna Seleimend
> **Section:** [Product](./) · ← [Documentation Index](../README.md)

A phased plan that follows the brief's advice: **prototype the riskiest technical piece first**, prove
it on a real mid-range phone, then build outward. Dates are indicative and firm up after Phase 0;
**sequencing and exit criteria are the commitments.**

## Phase 0 — Riskiest-first prototype (starting 2026-06)
**Goal:** prove `ffmpeg.wasm` can compress a representative video acceptably **on a mid-range phone**,
in a worker, with the engine lazy-loaded.

**Prerequisites:**
- Serve the prototype with **COOP/COEP** (cross-origin isolation) so the multi-threaded path can be
  exercised — validates the [PRD assumption](./prd.md#8-dependencies--assumptions) and
  [ADR-0002](../architecture/decisions/0002-web-workers-for-compute.md); engine build per
  [ADR-0006](../architecture/decisions/0006-ffmpeg-build-and-threading.md).
- Measure on a **physical Samsung Galaxy A54 5G** (remote debugging / manual DevTools); automated and
  device-farm runs are deferred to Phase 1 ([Testing Strategy](../engineering/testing-strategy.md)).
- Pick a **representative, license-clear test clip** (target: ~60 s, 1080p, H.264).

**Exit criteria:**
- Compress performance on the reference device clears the **provisional bar** below.
- Engine loads only on intent; size is known and disclosed.
- Confirmed: zero network egress of file bytes.
- Cross-origin isolation / `SharedArrayBuffer` path validated, **and** the single-threaded fallback
  exercised ([ADR-0006](../architecture/decisions/0006-ffmpeg-build-and-threading.md)).

**Provisional performance bar** (the go/no-go; exact numbers are *measured* in Phase 0, then ratified
into the [performance budget](../quality/performance-budget.md)):
- **Input:** the representative clip above.
- **Measure:** wall-clock compress time, peak memory (must **not** OOM), and output size reduction at
  comparable quality.
- **Provisional pass:** the clip compresses to completion on the Samsung Galaxy A54 5G **without OOM**
  and yields a **meaningfully smaller** file (initial goal **≥ ~50%** at comparable quality). The
  **first on-device run sets the time and peak-memory thresholds**, which are then ratified into the
  performance budget.

**Outcome (2026-06-07): PASS.** On the reference-device proxy (6× CPU throttle, ~50 s 1080p H.264),
`ffmpeg.wasm` encoded in ≈ 200 s (software, decode-bound) while **WebCodecs encoded in ≈ 22 s**
(hardware, ~0.4× real-time and throttle-insensitive). Both produced a correct, smaller file with zero
egress, and the single-threaded fallback worked. **Decision:** WebCodecs fast path + `ffmpeg.wasm`
fallback — see [ADR-0007](../architecture/decisions/0007-video-engine-webcodecs-with-ffmpeg-fallback.md).
Remaining due diligence: a confirming run on the **physical** A54 (hardware codecs already confirmed
available there).

> **If Phase 0 fails**, we re-pick the flagship *before* building UI — see [Scope](./scope.md).

## Phase 1 — Flagship MVP: video compressor
**Goal:** ship full v1 per [Scope & MVP](./scope.md).
**Includes:** complete compressor UX, presets + target-size, save-to-disk, progress/cancel, offline
PWA shell, command palette, accessibility pass, and the
[performance budget](../quality/performance-budget.md) enforced in [CI](../engineering/ci-cd.md).
**Exit criteria:** all [v1 acceptance criteria](./prd.md#7-acceptance-criteria-v1-done) pass.

## Phase 2 — Platform hardening
**Goal:** turn "one tool" into "a shell that tools slot into."
**Includes:** shared shell/router, capability-detection layer, fallback paths, the
[single-file build](../features/02-single-file-app.md) target, telemetry-free quality monitoring, and
an internal "how to add a tool" guide.

## Phase 3 — Second & third tools
**Goal:** validate the platform by adding tools with *different* technical spines.
**Candidates (prioritize by validated demand):**
- **PDF redactor** — high privacy resonance, lighter WASM.
- **CSV ↔ JSON ↔ Parquet converter** → opens the door to
  [big-data exploration](../features/05-big-data-exploration.md) (DuckDB-WASM).

## Phase 4 — On-device AI & vault (opt-in, heavy)
**Goal:** add the highest-value but heaviest capabilities, strictly behind explicit intent.
**Includes:** [on-device AI on WebGPU](../features/04-on-device-ai.md) (e.g., a background remover) and
the [encrypted vault](../features/03-encrypted-vault.md) for any data-keeping tool — with a clear
recovery story, or a deliberate and well-communicated absence of one.

## Continuous (every phase)
- Hold the [performance budget](../quality/performance-budget.md), enforced in [CI](../engineering/ci-cd.md).
- Maintain [accessibility](../quality/accessibility.md) and
  [progressive enhancement](../quality/progressive-enhancement.md).
- Test on the real mid-range reference device, not just laptops — see
  [Testing Strategy](../engineering/testing-strategy.md).
- Keep the [risk register](../reference/risks.md) current.

## Sequencing rationale
The order front-loads **technical risk** (Phase 0), then **user value** (Phase 1), then **leverage**
(Phase 2), then **breadth** (Phases 3–4). We never start a heavy capability before a lighter, working
baseline exists.
