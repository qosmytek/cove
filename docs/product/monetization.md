# Monetization

> **Status:** Stable (model decided 2026-06-06) · **Last updated:** 2026-06-06 · **Owner:** Victor Senna Seleimend
> **Section:** [Product](./) · ← [Documentation Index](../README.md)

The model has to fit the architecture: **no server, no accounts, no tracking, no dark patterns**
([ADR-0005](../architecture/decisions/0005-no-server-no-account.md),
[Calm by Design](../features/07-calm-design.md)). Anything that requires phoning home or surveilling
users is off the table.

## The model
**Free core + a one-time, offline-verifiable Pro license.**

1. **Free forever, no account.** Every core tool (starting with **Cove Compress** — see
   [Brand](./brand.md)) is fully usable for free. This *is* the marketing: the privacy promise is the
   product.
2. **Cove Pro — one-time purchase (no subscription).** Unlocks power features, e.g.:
   - batch processing,
   - advanced options (codec / quality controls, custom presets),
   - the full multi-tool suite as it grows,
   - exporting [single-file `.html`](../features/02-single-file-app.md) builds.
3. **Cove Team / Enterprise — one-time per-seat or site license.** For organizations that want to
   self-host or deploy single-file tools internally (air-gapped, regulated environments).

## How licensing works *without a server*
A license is a **signed token**: we sign it offline with a private key, and the app ships the matching
**public key** and verifies the signature locally. No activation server, no phone-home, no per-use
check — so buying Pro never creates an account or sends usage data, and the privacy guarantee stays
intact.

> **Trade-off:** offline licensing is inherently crackable. We treat Pro as *"pay because it's fair and
> you want this supported,"* not as DRM. That fits the audience and the [brand voice](./brand.md).

## Explicitly rejected
- **Subscriptions** — need server-side validation and recurring nags; un-calm and off-architecture.
- **Ads / analytics / data sale** — violate the entire premise
  ([Privacy & Security](../quality/privacy-security.md)).
- **Freemium dark patterns** — no nagging, no crippled free tier, no confirm-shaming
  ([Calm by Design](../features/07-calm-design.md)).

## Why this is viable
Marginal cost is near zero — static CDN plus the user's own compute ([Vision](./vision.md)). We don't
need high ARPU; a modest one-time price across many users sustains a solo maintainer. An optional
**"supporter" / pay-what-you-want** tier can sit alongside Pro for goodwill.

## Open items
- Price points for Pro and Team (set after the MVP proves value).
- Storefront / payment processor (one that doesn't compromise buyer privacy).
- Exact free-vs-Pro feature split per tool.

See also: [Vision](./vision.md) · [Brand](./brand.md) ·
[ADR-0005](../architecture/decisions/0005-no-server-no-account.md)
