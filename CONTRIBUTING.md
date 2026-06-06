# Contributing & Documentation Style Guide

> **Status:** Stable · **Last updated:** 2026-06-06 · **Owner:** Victor Senna Seleimend

Cove is built and maintained by a single developer (**Victor Senna Seleimend**). This page is the
working agreement: the conventions that keep the repo consistent while it's documentation, and as it
grows into code. It's one page on purpose — keep it that way.

← [Project README](README.md) · [Documentation Index](docs/README.md)

---

## 1. Repository conventions

- **Branch off `main`** for any non-trivial change; keep `main` releasable.
- **Conventional Commits:** `type(scope): summary` — e.g. `docs(prd): ratify performance budget`,
  `feat(compress): lazy-load ffmpeg`. Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`,
  `build`, `ci`.
- **Small, focused commits** — one logical change each.
- **The quality gates are law.** A change must stay within the
  [performance budget](docs/quality/performance-budget.md), remain
  [accessible](docs/quality/accessibility.md), and never break the
  [privacy guarantee](docs/quality/privacy-security.md). These are
  [CI gates](docs/engineering/ci-cd.md), not suggestions.
- **Architectural changes get an [ADR](docs/architecture/decisions/README.md).** Add a new one; don't
  rewrite an accepted decision.

## 2. Documentation rules

The docs are **modular**: one topic per file, short, and cross-linked. Rules:

1. **One purpose per file.** If a file is growing two topics, split it.
2. **Status values:** `Draft` (act on it, may change) · `Stable` (decided; change via PR + ADR if
   architectural) · `Superseded` (link the replacement).
3. **Link, don't repeat.** State a fact once in its home doc; everywhere else, link to it.
4. **Register new docs** in the relevant table in [docs/README.md](docs/README.md) (and the
   [project README](README.md) map, if useful).
5. **Relative links only** (`../quality/...`); make anchors match headings — GitHub slug rules:
   lowercase, spaces → `-`, punctuation dropped.
6. **Absolute dates** ("by Q3" → a real date) and keep `Last updated` current.

Every doc starts with this header block:

```
# Title

> **Status:** Draft · **Last updated:** YYYY-MM-DD · **Owner:** Victor Senna Seleimend
> **Section:** [Section](./) · ← [Documentation Index](../README.md)
```

**Two deliberate exceptions:** [ADRs](docs/architecture/decisions/README.md) use a dated variant
(`**Status:** Accepted · **Date:** … · ← [ADR index](./README.md)`) — a decision record is fixed at its
date, not "last updated." Landing/index pages (the project [README](README.md), the
[docs index](docs/README.md)) and the [source brief](docs/reference/source-brief.md) instead
state overall **project phase** and omit the `Section` line.

## 3. Adding a feature spec

Copy [docs/features/01-local-first-core.md](docs/features/01-local-first-core.md) and keep its shape:
**Summary → User value → How we build it → What to watch out for → Requirements →
Capability detection & fallback → Acceptance criteria → Dependencies → Open questions.**
Add a row to the [feature index](docs/features/README.md).

## 4. Style

- **Voice:** calm, plain, honest — the same [brand voice](docs/product/brand.md) we show users. Explain;
  don't hype.
- **Wrap prose at ~100 columns** (one sentence per line is also fine — cleaner diffs).
- **Tables** for option/decision matrices; **checklists** for acceptance criteria.
- **Product name is "Cove",** matching the repo folder `cove`.

## 5. Verifying docs

Keep cross-links healthy — no broken relative paths or anchors. Quick local pass to list every internal
link target (eyeball for typos / missing files):

```
grep -rhoE "\]\([^)]+\)" docs README.md CONTRIBUTING.md | sed -E 's/^\]\(//; s/\)$//' | sort -u
```

CI will enforce a full link + anchor check once the toolchain lands — see
[CI/CD](docs/engineering/ci-cd.md).
