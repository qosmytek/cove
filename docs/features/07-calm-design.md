# 07 · Calm by Design

> **Status:** Draft · **Last updated:** 2026-06-09 · **Owner:** Victor Senna Seleimend
> **Section:** [Features](./README.md) · **In v1:** ✅
> ← [Feature index](./README.md)

## Summary
The privacy stance makes anti-engagement natural: **no tracking, no dark patterns, no cookie banner**
(there's nothing to consent to), **system fonts**, **no third-party scripts**.

## User value
A tool that respects attention and the device: fast, quiet, honest. Nothing nags, tracks, or
manipulates.

## How we build it
- **Zero third-party scripts** and **zero analytics SDKs** — there is no data collection to power them.
- **No cookie / consent banner**, because there is nothing to consent to.
- **System font stack** (no web-font download) — also a performance win.
- Honest, non-manipulative UI: no fake urgency, forced flows, or confirm-shaming.

## What to watch out for
- **Spend the saved complexity budget on typography and spacing** so "minimal" reads as **intentional**
  rather than **unfinished**. Calm is a craft, not an absence of effort.

## Requirements
- **CD-1** No third-party scripts, trackers, analytics SDKs, or ad tech.
- **CD-2** No cookie / consent banner (nothing to consent to).
- **CD-3** System fonts; no blocking web-font fetch.
- **CD-4** No dark patterns (see checklist).
- **CD-5** Respect `prefers-reduced-motion` and `prefers-color-scheme`.

## Dark-pattern checklist (every item must be "no")
- [ ] No fake scarcity / urgency
- [ ] No confirm-shaming
- [ ] No forced continuity / hidden opt-outs
- [ ] No nagging modals
- [ ] No misdirection or misleading hierarchy
- [ ] No hidden costs

## Capability detection & fallback
No special browser capability is required — this is a stance, not an engine. `prefers-reduced-motion`
and `prefers-color-scheme` are honored where supported and fall back to sensible, motion-free defaults
where they aren't (CD-5). See [Progressive Enhancement](../quality/progressive-enhancement.md).

## Acceptance criteria
- [ ] The network panel shows no third-party or analytics requests.
- [ ] No consent banner appears anywhere.
- [ ] Reduced-motion and color-scheme preferences are honored.

## Dependencies
[Accessibility](../quality/accessibility.md) (overlapping concerns) ·
[Privacy & Security](../quality/privacy-security.md).

## Resolved
- **Quality monitoring (v1):** no telemetry **and no local usage counters** — quality feedback rides
  on a voluntary, on-device "Copy diagnostics" report (capabilities + log) that the user chooses to
  share. See [Adding a Tool](../engineering/adding-a-tool.md) and
  [ADR-0005](../architecture/decisions/0005-no-server-no-account.md).
