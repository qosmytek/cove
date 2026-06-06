# Product Overview

> **Status:** Draft · **Last updated:** 2026-06-06 · **Owner:** Victor Senna Seleimend
> **Section:** [Product](./) · ← [Documentation Index](../README.md)

A one-page snapshot. For the *why*, see [Vision](./vision.md); for detailed requirements, see the
[PRD](./prd.md).

## In one line

**Cove** is a fast, private, installable browser app that converts media, transforms files, and crunches
data **entirely on the user's device** — no upload, no server, no data to leak.

## The problem

People routinely need to compress a video, redact a PDF, remove an image background, or convert a
data file. Today that usually means uploading sensitive content to a stranger's server and trusting a
privacy policy. It's slow, it costs the provider money at scale, and it is a standing breach risk.

## Our solution

Do the heavy lifting in the browser with **WebAssembly** and **WebGPU**, read files through the
**File System Access API + OPFS**, and run all compute in **Web Workers** so the UI stays at 60fps.
Nothing is transmitted. The app installs as a **PWA** and works **offline**.

## Capabilities at a glance

| # | Capability | One-liner | Spec |
| - | ---------- | --------- | ---- |
| 1 | Local-first core | WASM compute on local files, in workers | [01](../features/01-local-first-core.md) |
| 2 | Single-file app | The tool inlined into one portable `.html` | [02](../features/02-single-file-app.md) |
| 3 | Encrypted vault | Client-side encryption for tools that keep data | [03](../features/03-encrypted-vault.md) |
| 4 | On-device AI | Private inference on WebGPU | [04](../features/04-on-device-ai.md) |
| 5 | Big-data exploration | Analytical SQL over millions of rows | [05](../features/05-big-data-exploration.md) |
| 6 | Offline-first PWA | Installable, works with no connectivity | [06](../features/06-offline-pwa.md) |
| 7 | Calm by design | No tracking, no dark patterns | [07](../features/07-calm-design.md) |
| 8 | Command palette | Keyboard-driven power-user control | [08](../features/08-command-palette.md) |

## Flagship (v1)

A **browser video compressor** on `ffmpeg.wasm` — the iconic use case and the riskiest technical
piece, so it de-risks everything else. See [Scope & MVP](./scope.md).

## Who it's for

Privacy-conscious individuals, freelancers handling client files, and small teams in regulated fields
(legal, medical, finance) who can't or won't upload sensitive content. See [Personas](./personas.md).

## Why now

Browser compute matured: `ffmpeg.wasm`, DuckDB-WASM, `transformers.js`/WebLLM, WebGPU, OPFS, and the
File System Access API are all production-viable. The pieces to move real workloads onto the client
finally exist together.

## How we win

Privacy that's **structurally true**, near-zero serving cost, and a calm, fast experience — a
combination an upload-based incumbent can't copy without abandoning its own model. See
[Vision → what makes it disruptive](./vision.md#what-makes-it-disruptive).

## The one big risk

**Payload weight.** WASM engines and AI weights can dwarf the app itself. Mitigation is a first-class
concern: lazy-load behind intent, cache aggressively, capability-detect, keep a fallback. See
[Performance Budget](../quality/performance-budget.md) and [Risks](../reference/risks.md).
