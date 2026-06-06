# Cove

> **Cove** is a fast, private, installable browser app that does its real work — media conversion,
> file transforms, data crunching — **entirely on the user's device**. There is no server to attack,
> no egress to pay for, and no file anyone has to "trust us" with.
>
> _Real tools. Nothing leaves your device._

**Status:** 📐 Pre-development (documentation phase) · **Last updated:** 2026-06-06 · **Owner:** Victor Senna Seleimend

> **Naming:** "Cove" is the product/brand and the repository folder name. See [Brand](docs/product/brand.md).

This repository currently contains **product documentation only**. No application code exists yet.
These documents define *what* we are building and *why*, so development can begin from a shared,
written foundation rather than from assumptions.

---

## The one-sentence pitch

We market privacy you **cannot violate** instead of a policy we merely promise to keep. The whole
product is the literal opposite of every "upload your file" SaaS: your data never leaves the device,
so it cannot be leaked.

## Flagship (MVP)

The first tool we ship is a **browser video compressor** powered by `ffmpeg.wasm`. It is the iconic
"SaaS killer" use case and also the riskiest, heaviest technical piece — proving it on a real
mid-range phone first de-risks the entire platform. See **[Scope & MVP](docs/product/scope.md)** and
the **[Roadmap](docs/product/roadmap.md)**.

## Start here

| If you want to…                     | Read |
| ----------------------------------- | ---- |
| Understand why this exists          | [Vision](docs/product/vision.md) |
| Get the full picture quickly        | [Product Overview](docs/product/overview.md) |
| See what we're building (and not)   | [Scope & MVP](docs/product/scope.md) |
| Read the detailed requirements      | [PRD](docs/product/prd.md) |
| Understand how it's built           | [Architecture Overview](docs/architecture/overview.md) |
| Browse the entire doc set           | [Documentation Index](docs/README.md) |
| Contribute / doc conventions        | [CONTRIBUTING](CONTRIBUTING.md) |

## Documentation map

- **[Product](docs/product/)** — vision, overview, personas, requirements, scope, roadmap, brand, monetization
- **[Features](docs/features/)** — one focused spec per capability
- **[Architecture](docs/architecture/)** — system design, tech stack, data flow, decisions (ADRs)
- **[Quality](docs/quality/)** — performance budget, accessibility, privacy & security, offline, progressive enhancement
- **[Engineering](docs/engineering/)** — testing strategy, CI/CD
- **[Reference](docs/reference/)** — glossary, risk register, FAQ, and the original brief

## How this documentation is organized

- Every document is **modular and single-purpose** — short, linkable, and cross-referenced.
- Each doc carries a **status** and a **last-updated** line. `Draft` means it is ready to act on but
  still open to change.
- Architectural choices live as numbered **[ADRs](docs/architecture/decisions/)**. When a decision
  changes we add a *new* ADR rather than rewriting history.
- Everything traces back to the originating **[source brief](docs/reference/source-brief.md)**, kept
  verbatim inside the repo so the project is self-contained.

## Guiding constraints (the non-negotiables)

1. **Data never leaves the device** unless the user explicitly exports or syncs it — and any sync
   carries ciphertext only. See [Privacy & Security](docs/quality/privacy-security.md).
2. **Payload weight is the #1 risk.** WASM engines and AI weights are lazy-loaded behind explicit
   intent, cached aggressively, and capability-detected, with a lighter fallback always available.
   See [Performance Budget](docs/quality/performance-budget.md).
3. **Core actions work before any heavy engine loads** (progressive enhancement). See
   [Progressive Enhancement](docs/quality/progressive-enhancement.md).
4. **Accessibility is non-negotiable** — keyboard navigation, focus management, semantic HTML,
   contrast, and reduced-motion support. See [Accessibility](docs/quality/accessibility.md).
