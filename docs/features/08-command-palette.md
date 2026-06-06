# 08 · Command Palette

> **Status:** Draft · **Last updated:** 2026-06-06 · **Owner:** Victor Senna Seleimend
> **Section:** [Features](./README.md) · **Source idea:** (19) · **In v1:** ✅ (should)
> ← [Feature index](./README.md)

## Summary
Keyboard-driven, power-user control: a single palette (e.g., ⌘K / Ctrl-K) to find and run any action.
This spec captures only what Cove needs from source-brief idea (19).

## User value
Sam and other keyboard users drive the whole app without reaching for the mouse — pick a file, choose a
preset, start or cancel a job, switch tools — all from the palette.

## How we build it
- A global shortcut opens a fuzzy-searchable list of **commands** registered by the shell and each tool.
- Commands are the *same* actions exposed in the UI (a single source of truth), so the palette never
  drifts out of sync.
- Full focus management: trap focus while open, restore on close, complete screen-reader labeling.

## What to watch out for
- **Discoverability:** keep a visible affordance and document the shortcut so the palette isn't a hidden
  feature.
- It must **enhance, not replace** the normal UI — everything stays doable without it (progressive
  enhancement + accessibility).

## Requirements
- **CP-1** A global shortcut opens the palette; Escape closes it and restores focus.
- **CP-2** Every primary action is reachable via the palette.
- **CP-3** Fuzzy search over command titles and aliases.
- **CP-4** Fully accessible: ARIA roles, keyboard navigation, screen-reader announcements.

## Capability detection & fallback
Pure DOM/JS; no special capability needed. On touch-only devices, the same commands remain available
through the standard UI.

## Acceptance criteria
- [ ] Every primary action can be completed from the palette via keyboard alone.
- [ ] Focus is trapped while open and restored on close; screen readers announce it correctly.

## Dependencies
[Accessibility](../quality/accessibility.md) ·
[Progressive Enhancement](../quality/progressive-enhancement.md).

## Open questions
- Final default shortcut(s), and how we surface them on first run?
