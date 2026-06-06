# Accessibility

> **Status:** Draft · **Last updated:** 2026-06-06 · **Owner:** Victor Senna Seleimend
> **Section:** [Quality](./) · ← [Documentation Index](../README.md)

**Accessibility is non-negotiable** — a release gate, not a backlog item. Target: **WCAG 2.2 AA**.

## Requirements
- **Keyboard:** every action operable by keyboard alone, including the
  [command palette](../features/08-command-palette.md). Logical tab order; always-visible focus.
- **Focus management:** trap focus in dialogs/palette; restore on close; move focus to new content
  (e.g., results) appropriately.
- **Semantic HTML:** native elements and landmarks first; ARIA only to fill genuine gaps.
- **Contrast:** meet WCAG AA contrast for text and meaningful UI.
- **Reduced motion:** honor `prefers-reduced-motion`; never convey essential info by motion alone.
- **Status & progress:** long-running compute announced via live regions, so screen-reader users hear
  progress and completion.
- **Forms & errors:** labelled controls; errors announced and programmatically associated.
- **Color independence:** never rely on color alone to convey state.

## Why it fits this product
Calm, minimal, semantic, no third-party widgets — the [calm-by-design](../features/07-calm-design.md)
stance and accessibility reinforce each other. Fewer moving parts means fewer ways to break a11y.

## How we verify
- **Automated:** axe-core in CI — **zero critical violations** is a gate. See [CI/CD](../engineering/ci-cd.md).
- **Keyboard pass:** manual tab-through of every flow each release.
- **Screen-reader smoke test:** at least one screen reader (e.g., NVDA / VoiceOver) on core flows.
- **Contrast checks** on the design tokens.

See [Testing Strategy](../engineering/testing-strategy.md).

## Acceptance criteria (apply to every feature)
- [ ] Fully keyboard-operable; visible focus throughout.
- [ ] axe-core: zero critical issues.
- [ ] Reduced-motion honored.
- [ ] Progress/results announced to assistive technology.

See also: [Calm by Design](../features/07-calm-design.md) ·
[Progressive Enhancement](./progressive-enhancement.md) ·
[Command Palette](../features/08-command-palette.md)
