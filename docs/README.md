# Documentation Index

> **Status:** Draft · **Last updated:** 2026-06-06 · **Owner:** Victor Senna Seleimend

This is the navigation hub for all product documentation. The docs are grouped into six sections.
Each file is self-contained and cross-linked, so you can enter anywhere and follow the links.
To write or extend these docs, follow the conventions in [CONTRIBUTING](../CONTRIBUTING.md).

← Back to [project README](../README.md)

---

## Reading paths

Pick the path that matches why you're here.

- **New to the project?** [Vision](product/vision.md) → [Overview](product/overview.md) → [Scope & MVP](product/scope.md)
- **Product / stakeholder?** [Overview](product/overview.md) → [Personas](product/personas.md) → [PRD](product/prd.md) → [Roadmap](product/roadmap.md)
- **Engineer about to build?** [Architecture Overview](architecture/overview.md) → [Tech Stack](architecture/tech-stack.md) → [Feature specs](features/README.md) → [Decisions](architecture/decisions/README.md)
- **Design / UX?** [Calm by Design](features/07-calm-design.md) → [Accessibility](quality/accessibility.md) → [Personas](product/personas.md)
- **Security / privacy reviewer?** [Privacy & Security](quality/privacy-security.md) → [Encrypted Vault](features/03-encrypted-vault.md) → [Data Flow](architecture/data-flow.md)

---

## 1. Product

The *what* and the *why*.

| Document | Purpose |
| -------- | ------- |
| [Vision](product/vision.md) | The thesis, positioning, and what "disruptive" means here. |
| [Overview](product/overview.md) | One-page summary of the whole product. |
| [Personas](product/personas.md) | Who we serve and the jobs they hire us for. |
| [PRD](product/prd.md) | Detailed product requirements, user stories, acceptance criteria. |
| [Scope & MVP](product/scope.md) | What's in v1, what's deferred, what's explicitly out. |
| [Roadmap](product/roadmap.md) | Phased plan from riskiest-prototype to platform. |
| [Brand](product/brand.md) | Product name (Cove), tagline, tool naming, voice. |
| [Monetization](product/monetization.md) | The business model: free core + one-time Pro license. |

## 2. Features

One focused spec per capability, each tracing back to the [source brief](reference/source-brief.md).

| Document | Covers |
| -------- | ------ |
| [Feature index](features/README.md) | Status table for all capabilities. |
| [01 · Local-First Core](features/01-local-first-core.md) | WASM compute, OPFS, Web Workers. |
| [02 · Single-File App](features/02-single-file-app.md) | One self-contained `.html`. |
| [03 · Encrypted Vault](features/03-encrypted-vault.md) | Web Crypto → IndexedDB. |
| [04 · On-Device AI](features/04-on-device-ai.md) | WebGPU inference. |
| [05 · Big-Data Exploration](features/05-big-data-exploration.md) | DuckDB-WASM over Parquet. |
| [06 · Offline-First PWA](features/06-offline-pwa.md) | Service worker, installable. |
| [07 · Calm by Design](features/07-calm-design.md) | No tracking, no dark patterns. |
| [08 · Command Palette](features/08-command-palette.md) | Keyboard-driven control. |

## 3. Architecture

The *how*.

| Document | Purpose |
| -------- | ------- |
| [Overview](architecture/overview.md) | System shape, layers, and runtime model. |
| [Tech Stack](architecture/tech-stack.md) | Chosen technologies and why. |
| [Data Flow](architecture/data-flow.md) | How bytes move — and why they stay put. |
| [Decisions (ADRs)](architecture/decisions/README.md) | The record of significant choices. |

## 4. Quality (non-functional requirements)

The constraints every feature must satisfy.

| Document | Purpose |
| -------- | ------- |
| [Performance Budget](quality/performance-budget.md) | The hard limits, enforced in CI. |
| [Accessibility](quality/accessibility.md) | WCAG targets and how we meet them. |
| [Privacy & Security](quality/privacy-security.md) | The threat model and the guarantees. |
| [Offline Strategy](quality/offline-strategy.md) | Service-worker caching and lifelines. |
| [Progressive Enhancement](quality/progressive-enhancement.md) | What works before the heavy engine loads. |

## 5. Engineering

| Document | Purpose |
| -------- | ------- |
| [Testing Strategy](engineering/testing-strategy.md) | What we test, where, and on what hardware. |
| [CI/CD](engineering/ci-cd.md) | The pipeline, gates, and release flow. |
| [Phase 0 Measurement](engineering/phase-0-measurement.md) | Running the prototype and measuring it on the reference device. |

## 6. Reference

| Document | Purpose |
| -------- | ------- |
| [Glossary](reference/glossary.md) | Plain-language definitions of every acronym. |
| [Risk Register](reference/risks.md) | Top risks, impact, and mitigations. |
| [FAQ](reference/faq.md) | Anticipated questions from users and stakeholders. |
| [Source Brief](reference/source-brief.md) | The original product brief. |

---

## Document status legend

| Badge | Meaning |
| ----- | ------- |
| `Draft` | Ready to act on; details may still change. |
| `Stable` | Reviewed and agreed; change via PR + ADR if architectural. |
| `Superseded` | Kept for history; see the linked replacement. |

Most documents sit at **Draft** (pre-development). Locked decisions — the
[performance budget](quality/performance-budget.md), [brand](product/brand.md), and
[monetization](product/monetization.md) — are marked **Stable**.
