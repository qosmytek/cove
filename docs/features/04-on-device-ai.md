# 04 · On-Device AI (WebGPU)

> **Status:** Draft · **Last updated:** 2026-06-06 · **Owner:** Victor Senna Seleimend
> **Section:** [Features](./README.md) · **Source idea:** (8) · **In v1:** ⏳ Phase 4
> ← [Feature index](./README.md)

## Summary
Private, zero-marginal-cost inference — smart autocomplete, an offline assistant, an image classifier,
a background remover — running on the user's GPU. No prompt or image ever leaves the device.

## User value
AI features with the same privacy guarantee as everything else, and no per-call cost or rate limit.

## How we build it
- Use **`transformers.js`** or **WebLLM** on **WebGPU**.
- **Cache model weights** after first load (Cache Storage / OPFS) so subsequent uses are fast and
  offline.
- Run inference off the main thread.

## What to watch out for
- **Gate behind explicit user intent.** Weights are **hundreds of MB** and the **first load is slow** —
  never download them speculatively. Disclose size and ask first. See
  [Performance Budget](../quality/performance-budget.md).
- WebGPU is not universal; design the **fallback before the feature**.

## Requirements
- **AI-1** Inference runs on-device; no input/output leaves the device.
- **AI-2** Weights load only on explicit intent, with size disclosed first.
- **AI-3** Weights are cached after first load for offline reuse.
- **AI-4** Provide a fallback when WebGPU is absent (see below).

## Capability detection & fallback
Detect WebGPU. If unavailable, in order of preference: a **lighter model / WASM-CPU** path where viable;
a **keyword/heuristic** path; or — **only with explicit, labeled opt-in** — an API proxy. The product's
default always stays local; sending data off-device is never silent. See
[Risks](../reference/risks.md) and [Progressive Enhancement](../quality/progressive-enhancement.md).

## Acceptance criteria
- [ ] With WebGPU present, the feature runs fully offline once weights are cached.
- [ ] Weights never download without explicit user action and size disclosure.
- [ ] Without WebGPU, the user gets a clear fallback or a graceful "not available here" message.

## Dependencies
[Local-First Core](./01-local-first-core.md) · [Tech Stack](../architecture/tech-stack.md) ·
[Offline PWA](./06-offline-pwa.md).

## Open questions
- First AI tool: a background remover (image) vs. a text assistant?
- Acceptable first-load weight ceiling on the reference device?
