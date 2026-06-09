# ADR-0008 · No UI framework for v1 (vanilla TS + native DOM)

> **Status:** Accepted · **Date:** 2026-06-07 · **Owner:** Victor Senna Seleimend · ← [ADR index](./README.md)

## Context
Phase 1 builds the full compressor UI — file pick, engine/preset controls, progress, results, and the
command palette — under a strict initial-payload budget (≤ 150 KB JS) and a non-negotiable
[accessibility](../../quality/accessibility.md) bar. The Phase 0 spike is already framework-free vanilla
TypeScript and its shell is ~6.7 KB. [Tech Stack](../tech-stack.md) deferred the framework choice to here.

## Decision
Ship v1 **without a UI framework** — vanilla TypeScript + native DOM APIs, adding only small, focused
helpers (or Web Components) where they clearly earn their bytes. Re-evaluate via a new ADR only if UI
complexity outgrows what plain DOM handles cleanly within budget (e.g. the shared multi-tool shell in
Phase 2).

## Consequences
- ✅ Smallest possible payload; nothing competes with the [performance budget](../../quality/performance-budget.md); no framework runtime to ship or keep updated.
- ✅ Direct control over semantic HTML + ARIA — no framework a11y quirks to work around.
- ✅ Continues the working Phase 0 spike; no migration.
- ⚠️ More manual DOM wiring; keep any state/templating helpers tiny and dependency-free.
- ✅ **Phase-2 revisit (2026-06-09):** the shared multi-tool shell ([Roadmap](../../product/roadmap.md), Phase 2) landed framework-free — a tool contract + host under `src/shell/` — with the entry chunk at ~5 kB, well within [budget](../../quality/performance-budget.md). Decision **affirmed**; no framework introduced.
- 🔗 Realized by the v1 compressor UI; serves [Accessibility](../../quality/accessibility.md) and the perf budget.
