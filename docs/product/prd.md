# Product Requirements Document (PRD)

> **Status:** Draft · **Last updated:** 2026-06-06 · **Owner:** Victor Senna Seleimend
> **Section:** [Product](./) · ← [Documentation Index](../README.md)

This PRD covers requirements for the **platform** and for the **v1 flagship: the video compressor**.
Feature depth lives in the [feature specs](../features/README.md); non-functional limits live in
[Quality](../quality/). This document ties them together with objectives, user stories, and
acceptance criteria.

## 1. Objectives

| # | Objective | Why |
| - | --------- | --- |
| O1 | Ship a video compressor that runs **100% on-device**. | Proves the anchor idea and the riskiest tech. |
| O2 | Keep the **initial payload tiny**; load engines only on intent. | Weight is the #1 risk. |
| O3 | Be **installable and fully offline-capable**. | Core differentiator for [Marco](./personas.md). |
| O4 | Be **accessible and calm** by default. | Non-negotiable quality bar and brand. |
| O5 | Establish a **platform shape** more tools slot into. | One excellent tool first, then breadth. |

## 2. Success metrics

- **Privacy (binary):** zero network egress of user file bytes — verifiable in DevTools and CI.
  *This must be true; it is not a target to approach.*
- **Performance:** initial shell within the [performance budget](../quality/performance-budget.md);
  compressor usable on the defined mid-range phone.
- **Task completion:** a first-time user compresses a video unaided, offline-capable after first load.
- **Accessibility:** zero critical axe-core violations; full keyboard operability.

## 3. Users & jobs

See [Personas](./personas.md). v1 optimizes for **Priya** (privacy-conscious professional) and
**Marco** (low-connectivity).

## 4. User stories

### Platform
- **US-1** As a user, I see what the app does immediately, before any heavy engine loads.
- **US-2** As a user, I can pick a file from disk (or drag it in) without it being uploaded anywhere.
- **US-3** As a user, I'm told clearly when a one-time engine download is needed — and how big it is —
  *before* it starts.
- **US-4** As a user, I can install the app and use it offline afterward.
- **US-5** As a keyboard user, I can drive every action via the command palette and tab order.
- **US-6** As a privacy-minded user, I can confirm (e.g., in DevTools) that nothing was sent.

### Flagship — video compressor
- **US-7** As Priya, I can drag in a video and get a smaller file back, on my device.
- **US-8** As Priya, I can choose a target (quality preset or target size) before compressing.
- **US-9** As Priya, I can see progress and an estimate while it runs, with the UI staying responsive.
- **US-10** As Priya, I can compare result size vs. original and save the output where I choose.
- **US-11** As Marco, I can do all of the above offline on a mid-range phone, with a graceful message
  if a capability is missing.

## 5. Functional requirements

### 5.1 Platform (apply to every tool)
- **FR-P1 Local-only processing.** All file bytes are read and processed locally; no user content is
  transmitted. See [Privacy & Security](../quality/privacy-security.md).
- **FR-P2 Intent-gated heavy loads.** WASM/AI engines load only after explicit user action, with a
  size disclosure first. See [Performance Budget](../quality/performance-budget.md).
- **FR-P3 Worker-based compute.** Heavy work runs in [Web Workers](../features/01-local-first-core.md);
  the main thread holds 60fps.
- **FR-P4 File access.** Use the [File System Access API + OPFS](../architecture/data-flow.md), with a
  download / `<input type="file">` fallback where unsupported.
- **FR-P5 Offline.** A [service worker](../features/06-offline-pwa.md) precaches the shell; the app is
  installable.
- **FR-P6 Progressive enhancement.** Core UI and file selection work before/without the engine. See
  [Progressive Enhancement](../quality/progressive-enhancement.md).
- **FR-P7 Capability detection & fallback.** Detect WebGPU, SharedArrayBuffer, OPFS, etc.; degrade
  gracefully. See [Risks](../reference/risks.md).
- **FR-P8 Calm UX.** No tracking, no third-party scripts, no cookie banner, no dark patterns. See
  [Calm by Design](../features/07-calm-design.md).
- **FR-P9 Accessibility.** Keyboard, focus management, semantic HTML, contrast, reduced-motion. See
  [Accessibility](../quality/accessibility.md).
- **FR-P10 Command palette.** Keyboard-driven navigation and actions. See
  [Command Palette](../features/08-command-palette.md).

### 5.2 Flagship — video compressor
- **FR-V1** Accept common inputs (at least MP4/H.264, WebM/VP9, MOV) via drag-drop or picker — H.264
  via the WebCodecs fast path, other codecs/containers via the `ffmpeg.wasm` fallback.
- **FR-V2** Offer at least quality presets (e.g., High / Balanced / Small) **and** an approximate
  target-size mode.
- **FR-V3** Compress **on-device, off the main thread**, via the **WebCodecs** hardware path with an
  **`ffmpeg.wasm` fallback** (capability-detected;
  [ADR-0007](../architecture/decisions/0007-video-engine-webcodecs-with-ffmpeg-fallback.md)); show
  progress (determinate where possible).
- **FR-V4** Keep the UI responsive and the job **cancelable** during compression.
- **FR-V5** Report output size and reduction vs. original; save to disk via FS Access API (fallback:
  download).
- **FR-V6** Load the compute engine only when the user starts a compression. The `ffmpeg.wasm` fallback
  is a large download, so disclose its size first; the WebCodecs path uses built-in OS codecs (no large
  download).
- **FR-V7** Handle large files without exhausting memory (the `ffmpeg.wasm` path mounts its input read-only via WORKERFS, since the stock core has no OPFS mount — true OPFS scratch is deferred;
  chunked/streamed decode→encode for the WebCodecs path) and fail gracefully with a clear message when
  the device can't.
- **FR-V8** Select the engine by **capability detection** — prefer the WebCodecs hardware path; fall
  back to `ffmpeg.wasm` when WebCodecs or the codec is unavailable, and retry single-threaded if a
  multi-threaded `ffmpeg.wasm` run crashes.
- **FR-V9** **Preserve the audio track** in the output — the engine must mux audio, not drop it.

## 6. Non-functional requirements

Defined in [Quality](../quality/): [Performance Budget](../quality/performance-budget.md),
[Accessibility](../quality/accessibility.md), [Privacy & Security](../quality/privacy-security.md),
[Offline Strategy](../quality/offline-strategy.md),
[Progressive Enhancement](../quality/progressive-enhancement.md). These are **gates**, not
nice-to-haves.

## 7. Acceptance criteria (v1 "done")

- [ ] On the defined mid-range phone, a representative clip compresses successfully **offline** after
      first load.
- [ ] No user file bytes appear in network traffic during any operation (verified manually + in CI).
- [ ] Initial shell payload is within the [performance budget](../quality/performance-budget.md); the
      compute engine loads only on intent (the `ffmpeg.wasm` fallback discloses its size first).
- [ ] App installs as a PWA and launches/works with no network.
- [ ] All flows are fully keyboard-operable; axe-core reports zero critical issues.
- [ ] When a required capability is missing, the user sees a clear explanation and any fallback.

## 8. Dependencies & assumptions

- Browser support for the chosen APIs on target devices (see [Tech Stack](../architecture/tech-stack.md)).
- On-device compression is fast enough on the mid-range target — **validated in the
  [Phase 0 prototype](./roadmap.md#phase-0--riskiest-first-prototype-starting-2026-06)**: WebCodecs
  (hardware) is the fast path, `ffmpeg.wasm` the fallback
  ([ADR-0007](../architecture/decisions/0007-video-engine-webcodecs-with-ffmpeg-fallback.md)).
- Cross-origin isolation (COOP/COEP) is available for `SharedArrayBuffer` where needed — see
  [ADR-0002](../architecture/decisions/0002-web-workers-for-compute.md).

## 9. Out of scope for v1

See [Scope & MVP](./scope.md#explicitly-out-of-scope). Notably: accounts, any server-side processing,
multi-tool breadth, and sync.

## 10. Decisions & open questions

**Resolved (2026-06-06):**
- **Name / brand:** Cove — see [Brand](./brand.md).
- **Reference device:** Samsung Galaxy A54 5G (CI proxy: Lighthouse mobile preset) — see
  [Testing Strategy](../engineering/testing-strategy.md#device--browser-matrix).
- **Performance budget:** ratified — see [Performance Budget](../quality/performance-budget.md).
- **Monetization:** free core + one-time, offline-verifiable Pro license — see
  [Monetization](./monetization.md).

**Still open** (tracked in [Risks](../reference/risks.md) and each feature's "Open questions"):
- Exact CSP `connect-src` allowlist for [feature 05](../features/05-big-data-exploration.md) — tracked in
  [Privacy & Security](../quality/privacy-security.md#open-questions).
- Vault recovery model ([feature 03](../features/03-encrypted-vault.md)).
- First on-device-AI tool ([feature 04](../features/04-on-device-ai.md)).
