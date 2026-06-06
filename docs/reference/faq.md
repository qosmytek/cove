# FAQ

> **Status:** Draft · **Last updated:** 2026-06-06 · **Owner:** Victor Senna Seleimend
> **Section:** [Reference](./) · ← [Documentation Index](../README.md)

Anticipated questions from users and stakeholders.

## For users

**Where do my files go?**
Nowhere. They're processed on your device, in your browser. They are never uploaded. See
[Privacy & Security](../quality/privacy-security.md).

**How can I trust that?**
The guarantee is architectural, not a promise — there's no server to receive your files. You can verify
in your browser's network panel that nothing is sent. See [Data Flow](../architecture/data-flow.md).

**Does it work offline?**
Yes — after the first visit it's installable and works offline. See
[Offline-First PWA](../features/06-offline-pwa.md).

**Why is the first run a bigger download?**
Real work needs a compute engine (e.g., `ffmpeg.wasm`). We load it only when you start a task, tell you
the size first, then cache it so next time is fast. See
[Performance Budget](../quality/performance-budget.md).

**What if my browser or phone doesn't support a feature?**
We detect that and fall back to a lighter path, or tell you clearly. See
[Progressive Enhancement](../quality/progressive-enhancement.md).

**If I use the vault and forget my passphrase?**
By design, we can't recover it — that's what makes it private. The app warns you before you rely on it.
See [Encrypted Vault](../features/03-encrypted-vault.md).

## For stakeholders

**What's the business case?**
Privacy you can't violate → zero storage/egress liability, no data-processing compliance burden, and
near-zero marginal cost (serve a million users from a CDN). See [Vision](../product/vision.md).

**Why one tool first?**
The brief's principle: one strong idea executed exceptionally well beats stacking everything at once. v1
is the [video compressor](../product/scope.md); the platform grows from there
([Roadmap](../product/roadmap.md)).

**What's the biggest risk?**
Payload weight — see [Risks](./risks.md). It's why the performance budget is a CI gate.

**How do we make money?**
**Free core + a one-time, offline-verifiable Cove Pro license** — no subscription, no accounts, no ads,
no data sale. Power features and the wider tool suite are Pro; the privacy promise stays free. See
[Monetization](../product/monetization.md).

See also: [Documentation Index](../README.md)
