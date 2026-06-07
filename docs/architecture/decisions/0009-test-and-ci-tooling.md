# ADR-0009 · Test & CI tooling

> **Status:** Accepted · **Date:** 2026-06-07 · **Owner:** Victor Senna Seleimend · ← [ADR index](./README.md)

## Context
Phase 1 must turn our quality bars into automated gates — no-egress, bundle size, performance,
accessibility, and core E2E flows — per [Testing Strategy](../../engineering/testing-strategy.md) and
[CI/CD](../../engineering/ci-cd.md), which left the runner, E2E tool, CI provider, and real-device
approach open (deferred from Phase 0).

## Decision
- **Unit / integration:** **Vitest** (native to our Vite toolchain).
- **E2E, a11y, no-egress:** **Playwright** (Chromium with COOP/COEP), **axe-core** via
  `@axe-core/playwright`, and a network-interception assertion that **no request carries user file bytes**.
- **Performance gates:** **Lighthouse CI** (throttled mobile profile) for the shell budget, plus
  **size-limit** for the bundle-size gate ("no engine in the entry chunk").
- **CI provider:** **GitHub Actions**.
- **Real device:** Phase 1 runs the throttled proxy in CI; **physical-A54 spot-checks stay manual** at
  release; a device farm is deferred.

## Consequences
- ✅ Every gate in the docs maps to a tool; a Vite-native runner + the de-facto browser tool, both of
  which honor our cross-origin-isolation headers.
- ⚠️ The proxy only approximates the A54 — the device stays the source of truth (manual at release).
- ⚠️ Headless CI may lack hardware video codecs, so WebCodecs can run software/absent there: the
  **correctness** gates (no-egress, a11y, E2E) still hold, but **hardware-speed** verification remains a
  manual on-device check ([ADR-0007](./0007-video-engine-webcodecs-with-ffmpeg-fallback.md)).
- 🔗 Implements [Testing Strategy](../../engineering/testing-strategy.md) + [CI/CD](../../engineering/ci-cd.md); enforces [Performance Budget](../../quality/performance-budget.md) + [Accessibility](../../quality/accessibility.md).
