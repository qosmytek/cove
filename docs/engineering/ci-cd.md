# CI/CD

> **Status:** Draft · **Last updated:** 2026-06-06 · **Owner:** Victor Senna Seleimend
> **Section:** [Engineering](./) · ← [Documentation Index](../README.md)

The pipeline turns our quality bars into **gates**: privacy, performance, and accessibility are checked
automatically on every change.

## Pipeline stages (proposed)
1. **Install & build** — reproducible build (Vite / esbuild).
2. **Static checks** — lint, format, type-check.
3. **Unit + integration tests** — see [Testing Strategy](./testing-strategy.md).
4. **E2E** — core flows in a real browser (incl. offline + keyboard-only).
5. **Non-functional gates (blocking):**
   - **Bundle-size** within [budget](../quality/performance-budget.md); no engine in initial payload.
   - **Lighthouse CI** on a throttled mid-range profile.
   - **axe-core** zero critical issues.
   - **No-egress** network assertion.
6. **Preview deploy** — static artifact to a preview URL.
7. **Release** — promote immutable, versioned assets to the CDN.

## Gate philosophy
- Gates **fail the build**; they are not warnings.
- A gate may be relaxed only via an explicit, recorded decision
  ([ADR](../architecture/decisions/README.md)).

## Hosting / deploy requirements
- Static CDN only — no app server ([ADR-0005](../architecture/decisions/0005-no-server-no-account.md)).
- **COOP/COEP** headers for cross-origin isolation
  ([ADR-0002](../architecture/decisions/0002-web-workers-for-compute.md)).
- Strict **CSP** and HTTPS ([Privacy & Security](../quality/privacy-security.md)).
- Immutable, content-hashed assets; correct caching headers for the
  [service worker](../features/06-offline-pwa.md).

## Supply chain
- Minimal dependencies; pinned versions; periodic audit.
- No third-party runtime scripts ([Calm by Design](../features/07-calm-design.md)).

## Open questions
- CI provider and automated real-device testing (cloud device farm vs. self-hosted) — chosen in
  Phase 1; Phase 0 measures manually on a physical device.
- Release cadence and versioning scheme.

See also: [Testing Strategy](./testing-strategy.md) · [Performance Budget](../quality/performance-budget.md)
