# Scope & MVP

> **Status:** Draft · **Last updated:** 2026-06-06 · **Owner:** Victor Senna Seleimend
> **Section:** [Product](./) · ← [Documentation Index](../README.md)

Defines what v1 is, what's deferred, and what's deliberately excluded. The guiding rule from the
brief: **one strong idea executed exceptionally well, not everything stacked at once.**

## MVP definition

**v1 is a browser video compressor** (WebCodecs hardware path with an `ffmpeg.wasm` fallback) that runs
entirely on-device, installs as a PWA, and works offline. It is the iconic "SaaS killer" use case and the **riskiest technical piece** —
proving it first de-risks the whole platform.

### In scope for v1
- Drag-drop / file-picker input for common video formats.
- Quality presets **and** approximate target-size compression.
- On-device compute off the main thread (WebCodecs fast path + `ffmpeg.wasm` fallback); responsive,
  cancelable UI with progress.
- Lazy, intent-gated engine load with size disclosure.
- Save output via File System Access API (download fallback).
- Installable, offline-first PWA shell.
- Command palette + full keyboard operability.
- Calm, accessible UI within the [performance budget](../quality/performance-budget.md).

### Deferred (planned, not in v1)
| Capability | Why later | Spec |
| ---------- | --------- | ---- |
| More tools (PDF redactor, background remover, data converter) | Prove one tool first | [Features](../features/README.md) |
| On-device AI (WebGPU) | Heaviest / most fragile; gate behind intent | [04](../features/04-on-device-ai.md) |
| Big-data SQL exploration | Different audience (Sam) | [05](../features/05-big-data-exploration.md) |
| Encrypted vault | Only needed by data-keeping tools | [03](../features/03-encrypted-vault.md) |
| Single-file build | Valuable, but a packaging concern after the core works | [02](../features/02-single-file-app.md) |

### Explicitly out of scope
- **Any server-side processing or "upload" path.** This would break the core promise.
- **Accounts, logins, user databases.** Nothing to store, nothing to breach.
- **Tracking / analytics SDKs, third-party scripts, ad tech.** See [Calm by Design](../features/07-calm-design.md).
- **Cloud sync of plaintext.** If sync ever ships, it carries **ciphertext only**
  ([vault spec](../features/03-encrypted-vault.md)).

## The MoSCoW cut for v1

- **Must:** FR-P1–P9, FR-V1–V6, and FR-V8–V9 (see [PRD](./prd.md#5-functional-requirements)).
- **Should:** FR-P10 (command palette), FR-V7 (large-file resilience).
- **Could:** batch compression, advanced codec options.
- **Won't (v1):** everything under "Deferred" and "Out of scope" above.

## Definition of done

All v1 [acceptance criteria](./prd.md#7-acceptance-criteria-v1-done) pass, on the defined mid-range
reference device, offline.

See also: [Roadmap](./roadmap.md) · [PRD](./prd.md)
