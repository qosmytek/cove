# 06 · Offline-First PWA

> **Status:** Draft · **Last updated:** 2026-06-06 · **Owner:** Victor Senna Seleimend
> **Section:** [Features](./README.md) · **In v1:** ✅
> ← [Feature index](./README.md)

## Summary
Make the app **installable** and **fully functional offline** with a **service worker** — a genuine
lifeline on poor or no connectivity.

## User value
Marco installs it once and it works on a plane, in the field, on metered data — instantly, every time.

## How we build it
- **Service worker** caching: **precache the app shell**; **stale-while-revalidate** for content.
- Cache lazily-loaded **engines** (e.g., `ffmpeg.wasm`) after first use, so repeat tasks work offline.
- A **web app manifest** (name, icons, display mode) for installability.

## What to watch out for
- **Cache correctness / versioning:** a stale shell that won't update is the classic PWA failure.
  Version the cache and ship a clear update path.
- Precache only the **light shell** — never the heavy engines (those stay intent-gated and are cached
  on first use). See [Performance Budget](../quality/performance-budget.md).

## Requirements
- **PW-1** App shell precached; the app loads and core UI works fully offline.
- **PW-2** Installable via a valid web app manifest.
- **PW-3** Stale-while-revalidate for content; explicit versioning for the shell.
- **PW-4** Lazily-loaded engines cached after first use for offline reuse.

## Capability detection & fallback
Service-worker support and install prompts vary by browser; the app must remain fully usable as an
ordinary tab when not installed. No feature depends on being installed.

## Acceptance criteria
- [ ] After the first visit, the app loads and the compressor runs with the network disabled.
- [ ] Installing produces an app launchable offline.
- [ ] A shell update is picked up cleanly (no stuck stale version).

## Dependencies
[Offline Strategy](../quality/offline-strategy.md) · [Local-First Core](./01-local-first-core.md).

## Open questions
- Update UX: silent on next launch, or a "refresh to update" prompt?
