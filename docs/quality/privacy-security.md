# Privacy & Security

> **Status:** Draft · **Last updated:** 2026-06-06 · **Owner:** Victor Senna Seleimend
> **Section:** [Quality](./) · ← [Documentation Index](../README.md)

Privacy isn't a policy here; it's the architecture. This document states the guarantee, the threat
model, and the controls that keep the guarantee true.

## The guarantee
**User content never leaves the device.** There is no server that receives, processes, or stores user
files. The claim is **structural and verifiable**, not a promise. See
[ADR-0005](../architecture/decisions/0005-no-server-no-account.md) and
[Data Flow](../architecture/data-flow.md).

## Threat model
| Threat | Our position |
| ------ | ------------ |
| Server breach exposes user files | **No server holds files** — nothing to breach. |
| Provider logs/sells user data | **No data collection**; no analytics or third-party scripts. |
| Network interception of content | **Content isn't transmitted.** |
| Compromised dependency exfiltrates data | Minimize deps; **CSP blocks unexpected egress**; SRI; review. |
| Local device compromise | Outside our control, but the [vault](../features/03-encrypted-vault.md) encrypts data at rest. |
| Lost passphrase | Data is unrecoverable **by design** — disclosed up front. |

## What we store / send
- **Store on our side:** nothing about users — no accounts, no database
  ([ADR-0005](../architecture/decisions/0005-no-server-no-account.md)).
- **Send from the device:** only requests for **our own static assets** (shell, engines) from the CDN;
  optionally **ciphertext** if vault sync is ever enabled. **Never** user content. See
  [Data Flow → what crosses the network](../architecture/data-flow.md#what-crosses-the-network-vs-what-never-does).

## Encrypted vault (data-keeping tools)
For tools that persist data: encrypt **client-side** with **Web Crypto** (Argon2/PBKDF2 → AES-GCM) into
**IndexedDB**; persist and sync **ciphertext only**. Key management is the whole game — see
[Encrypted Vault](../features/03-encrypted-vault.md).

## Securing the (minimal) data layer
If any sync ships: **ciphertext only, never plaintext**, short-lived tokens, least privilege. This is
the single place the brief flags as needing data-layer care.

## Browser-level controls
- **Content Security Policy (CSP):** strict; restrict `connect-src` so unexpected egress is blocked even
  if a dependency is compromised.
- **Subresource Integrity (SRI)** for any externally hosted asset.
- **Cross-origin isolation (COOP/COEP)** for `SharedArrayBuffer` — see
  [ADR-0002](../architecture/decisions/0002-web-workers-for-compute.md).
- **HTTPS** everywhere; immutable, versioned assets.
- **No third-party scripts** — the smallest possible supply-chain surface
  ([Calm by Design](../features/07-calm-design.md)).

## Verification
- **Manual:** DevTools network panel shows no user-content requests during any operation.
- **CI:** automated network assertion on core flows (no unexpected egress). See
  [Testing Strategy](../engineering/testing-strategy.md).
- **Periodic** dependency review / audit.

## Open questions
- Exact CSP `connect-src` allowlist (CDN origin + range-request hosts for
  [feature 05](../features/05-big-data-exploration.md)).
- Do we publish a public, plain-language privacy statement that simply describes the architecture?

See also: [Vision](../product/vision.md) · [Encrypted Vault](../features/03-encrypted-vault.md) ·
[Data Flow](../architecture/data-flow.md)
