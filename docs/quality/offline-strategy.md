# Offline Strategy

> **Status:** Draft · **Last updated:** 2026-06-06 · **Owner:** Victor Senna Seleimend
> **Section:** [Quality](./) · ← [Documentation Index](../README.md)

The app must be a genuine lifeline on poor or no connectivity. This describes the caching strategy that
makes it work offline; the feature-level spec is [Offline-First PWA](../features/06-offline-pwa.md).

## Goals
- After the first visit, the **shell loads and core UI works with no network**.
- After first use of a tool, its **engine is cached** so the tool works offline too.
- Updates are picked up **reliably** — no stuck stale version.

## Caching model (service worker)
| Asset class | Strategy | Why |
| ----------- | -------- | --- |
| App shell (HTML/CSS/JS) | **Precache** on install | Instant, offline-first load. |
| Static content / icons | **Stale-while-revalidate** | Fast, self-healing. |
| Lazy engines (`ffmpeg.wasm`, …) | **Cache on first use** | Too heavy to precache; cached after intent. |
| AI weights (Phase 4) | **Cache on first use**, explicit | Hundreds of MB; opt-in only. |
| User content | **Never** handled by the SW as network | It never goes over the network at all. |

## Versioning & updates
- Version the precache; clean up old caches on `activate`.
- Decide the update UX (silent next-launch vs. "refresh to update") — see the
  [feature open question](../features/06-offline-pwa.md#open-questions).
- Never trap users on a broken stale shell: ship a recovery path.

## Storage budgets & eviction
- Be deliberate about how much we cache (engines/weights are large); respect browser eviction.
- Surface "this needs ~N MB to work offline" before caching big assets — consistent with the
  [performance budget](./performance-budget.md)'s disclose-before-download rule.

## Capability & fallback
Service workers and install prompts vary; the app stays fully usable as a normal tab when not installed.
No feature requires installation. See [Progressive Enhancement](./progressive-enhancement.md).

## Acceptance criteria
- [ ] Cold offline load works after the first visit.
- [ ] A tool used once works offline the next time.
- [ ] Shell updates apply cleanly.

See also: [Offline-First PWA](../features/06-offline-pwa.md) · [Performance Budget](./performance-budget.md)
