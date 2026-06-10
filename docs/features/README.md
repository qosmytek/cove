# Features

> **Status:** Draft · **Last updated:** 2026-06-10 · **Owner:** Victor Senna Seleimend
> **Section:** Features · ← [Documentation Index](../README.md)

One focused spec per capability. Each is self-contained and traces back to the
[source brief](../reference/source-brief.md).

## Capability map

| # | Feature | In v1? | Primary risk | Spec |
| - | ------- | ------ | ------------ | ---- |
| 01 | Local-First Core | ✅ core | Payload weight | [open](./01-local-first-core.md) |
| 02 | Single-File App | ⏳ Phase 3 | No code-splitting | [open](./02-single-file-app.md) |
| 03 | Encrypted Vault | ⏳ Phase 4 | Key management | [open](./03-encrypted-vault.md) |
| 04 | On-Device AI | ⏳ Phase 4 | Weight + WebGPU support | [open](./04-on-device-ai.md) |
| 05 | Big-Data Exploration | ⏳ Phase 3 | Memory on large data | [open](./05-big-data-exploration.md) |
| 06 | Offline-First PWA | ✅ v1 | Cache correctness | [open](./06-offline-pwa.md) |
| 07 | Calm by Design | ✅ v1 | "Minimal" reading as unfinished | [open](./07-calm-design.md) |
| 08 | Command Palette | ✅ v1 (should) | Discoverability | [open](./08-command-palette.md) |
| 09 | PDF Redactor | ⏳ Phase 3 (lead) | Incomplete redaction (recoverable data) | [open](./09-pdf-redactor.md) |

Legend: ✅ in v1 · ⏳ deferred — see [Roadmap](../product/roadmap.md) and [Scope](../product/scope.md).

## How to read a feature spec
Each spec follows the same shape:

**Summary → User value → How we build it → What to watch out for → Requirements →
Capability detection & fallback → Acceptance criteria → Dependencies → Open questions.**

That consistency is intentional. New features copy the structure of
[01 · Local-First Core](./01-local-first-core.md).
