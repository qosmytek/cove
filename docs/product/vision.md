# Vision & Positioning

> **Status:** Draft · **Last updated:** 2026-06-06 · **Owner:** Victor Senna Seleimend
> **Section:** [Product](./) · ← [Documentation Index](../README.md)

## The thesis

Every mainstream "do something with your file" product follows the same shape: you upload your data
to someone else's server, they process it, and you trust their policy not to keep, leak, sell, or
get breached out of it. That trust is the product's central liability — and, ultimately, its central
lie, because no policy can make a breach *impossible*.

**We invert it.** The work happens entirely on the user's own device. The file never leaves. There
is no server to attack, no egress to pay for, and nothing for anyone to "trust us" with. We don't
*promise* privacy; we ship an architecture in which violating it is **structurally impossible**.

## Positioning statement

> For **privacy-conscious people and teams** who need to convert, transform, or analyze their own
> files, **Cove** is **a suite of browser apps that do the real work on your
> device**. Unlike **upload-based SaaS tools**, it **never transmits your data anywhere**, works
> **offline**, and costs almost nothing to serve — so it stays fast, calm, and private.

## What makes it disruptive

We market privacy you **can't violate** rather than a policy we merely promise to keep. The business
consequences follow directly from the architecture:

- **Zero storage and egress liability.** We never hold user files, so we can't lose them.
- **No data-processing compliance burden.** There is no personal data on our side to govern.
- **Near-zero marginal cost.** Compute is the user's own CPU/GPU. We can serve a million users from a
  CDN for roughly the price of serving a few.
- **A moat incumbents can't cheaply copy.** An upload-based SaaS can't match "your data never leaves"
  without dismantling the server business its revenue depends on.

## The anchor idea

A **local-first tool**: the literal opposite of every "upload your file" SaaS. Concrete shapes it can
take include a browser **video compressor**, a **PDF redactor**, a **background remover**, and a
**CSV ↔ JSON ↔ Parquet converter**. We lead with the **video compressor** — see
[Scope & MVP](./scope.md).

## Strategic principles

1. **One strong idea, executed exceptionally well** — not everything stacked at once. We ship one
   flagship tool that is genuinely excellent before broadening. See [Roadmap](./roadmap.md).
2. **Prove the riskiest piece first.** For us that's the WASM tooling and on-device model load,
   proven on a real *mid-range phone* — not a developer laptop.
3. **Weight is the enemy.** The biggest threat to a "fast, private" promise is shipping megabytes of
   engine before the user has asked for anything. We budget bytes like money. See
   [Performance Budget](../quality/performance-budget.md).
4. **Calm by default.** No tracking, no dark patterns, no engagement loops. Privacy makes
   anti-engagement natural; we lean into it. See [Calm by Design](../features/07-calm-design.md).

## What success looks like

- A user compresses a video on a mid-range phone, fully offline, faster than they could upload it to
  a SaaS — and trusts, correctly, that the file never left the device.
- The app is installable, opens instantly on repeat visits, and still works on a plane.
- "Minimal" reads as intentional and premium, not unfinished.
- We can state, in one sentence, a privacy guarantee that is **structurally true**.

## Non-goals

- No "upload" fallback that quietly sends files to a server.
- No maximizing of time-on-app, session count, or any engagement metric.
- No sprawling everything-suite in v1.

See also: [Brand](./brand.md) · [Monetization](./monetization.md) · [Overview](./overview.md) · [Personas](./personas.md) · [Privacy & Security](../quality/privacy-security.md)
