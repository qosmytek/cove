# ADR-0005 · No server-side processing, no accounts

> **Status:** Accepted · **Date:** 2026-06-06 · **Owner:** Victor Senna Seleimend · ← [ADR index](./README.md)

## Context
The entire value proposition is privacy that is *structurally* guaranteed. Any server that processes or
stores user data — and any account system — would reintroduce the very liability we are eliminating.

## Decision
Ship **no backend application server, no user database, and no accounts**. The only server role is a
**static CDN** serving immutable assets. Any future sync (e.g., for the vault) transmits **ciphertext
only**, with short-lived tokens and least privilege.

## Consequences
- ✅ Zero storage/egress liability; no data-processing compliance burden; near-zero marginal cost.
- ✅ The privacy claim becomes verifiable, not merely promised.
- ⚠️ No server-side features (cross-device sync, server logs) without explicit, privacy-preserving
  design — and never plaintext.
- 🔗 Underpins [Vision](../../product/vision.md) and
  [Privacy & Security](../../quality/privacy-security.md).
