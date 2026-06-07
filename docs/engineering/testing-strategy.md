# Testing Strategy

> **Status:** Draft · **Last updated:** 2026-06-06 · **Owner:** Victor Senna Seleimend
> **Section:** [Engineering](./) · ← [Documentation Index](../README.md)

What we test, where, and — critically — **on what hardware**. The brief's recurring instruction: prove
it on a real *mid-range phone*, not a laptop.

## Principles
- **The privacy guarantee is testable** — assert no egress of user bytes, automatically.
- **The performance budget is testable** — enforce it in CI ([Performance Budget](../quality/performance-budget.md)).
- **Test the fallbacks**, not just the happy path — capability detection means multiple code paths.
- **Real-device truth:** the mid-range phone is the source of truth for performance.

## Test levels
| Level | Scope | Examples |
| ----- | ----- | -------- |
| **Unit** | Pure logic | size estimation, target-size math, capability-detection helpers |
| **Integration** | Worker + WASM boundaries | compress a tiny fixture via the worker; FS Access / OPFS adapters |
| **E2E** | Full flows in a real browser | drag → compress → save; offline run; keyboard-only run |
| **Non-functional gates** | Cross-cutting | egress assertion, bundle size, Lighthouse, axe-core |

## Non-functional gates (blocking in CI)
- **No-egress assertion:** intercept network during core flows; **fail** if any user file bytes are
  sent. Backs the [privacy guarantee](../quality/privacy-security.md) and the
  [acceptance criteria](../product/prd.md#7-acceptance-criteria-v1-done).
- **Bundle-size gate:** initial JS/total within [budget](../quality/performance-budget.md); "no engine
  in initial payload."
- **Lighthouse CI:** perf / PWA / best-practices assertions on a throttled mid-range profile.
- **axe-core:** zero critical [accessibility](../quality/accessibility.md) violations.

## Device & browser matrix
| Tier | Examples | Why |
| ---- | -------- | --- |
| **Reference mid-range phone** | **Samsung Galaxy A54 5G** (Exynos 1380, 8 GB RAM) — or an equivalent ~2023–24 mid-ranger (Pixel 6a, Galaxy A5x) | The true perf/memory constraint; source of truth for the [performance budget](../quality/performance-budget.md). |
| **CI throttling proxy** | Lighthouse "mobile" preset (≈ Moto G Power: 4× CPU slowdown, Slow 4G ≈ 1.6 Mbps) | Reproducible budget enforcement in [CI](./ci-cd.md). |
| Desktop evergreen | latest Chromium, Firefox, Safari | Capability coverage incl. FS Access / WebGPU variance. |
| Fallback contexts | non-isolated origin; `file://` single-file | Exercise single-threaded / no-OPFS paths. |

## Manual checks each release
- Keyboard-only pass + screen-reader smoke test ([Accessibility](../quality/accessibility.md)).
- Offline cold-load + "used-once, now offline" tool run.
- DevTools network review during a real task.

## Test data
Use small, license-clear media/data fixtures; **never commit real user content.**

## Open questions
- The E2E runner is **Playwright** ([ADR-0009](../architecture/decisions/0009-test-and-ci-tooling.md));
  automated real-device runs (device farm) stay deferred — the throttled proxy runs in CI, with manual
  physical-A54 checks.

See also: [CI/CD](./ci-cd.md) · [Performance Budget](../quality/performance-budget.md)
