# 03 · Encrypted Vault

> **Status:** Draft · **Last updated:** 2026-06-06 · **Owner:** Victor Senna Seleimend
> **Section:** [Features](./README.md) · **In v1:** ⏳ Phase 4
> ← [Feature index](./README.md)

## Summary
For tools that **keep** data — a private journal, notes, a password manager — encrypt **in the browser**
before anything is persisted, and sync only ciphertext if sync is ever offered.

## User value
Persistent, private data the user fully controls. Even if local storage or any future sync server were
compromised, the attacker gets ciphertext.

## How we build it
- Derive a key from the user's passphrase with **Argon2** (preferred) or **PBKDF2**.
- Encrypt with **AES-GCM** via **Web Crypto**.
- Persist **ciphertext** to **IndexedDB**. Plaintext exists only transiently in memory.
- If sync is added: transmit **ciphertext only**, with short-lived tokens and least privilege. See
  [Privacy & Security](../quality/privacy-security.md).

## What to watch out for
- **Key management is the entire game.** Be explicit about **recovery** — or about its **deliberate
  absence**. If the passphrase is lost, the data is gone, and the UI must say so plainly *before* the
  user commits anything.
- Never log, sync, or persist plaintext or the derived key.

## Requirements
- **EV-1** Encrypt client-side before any persistence (Web Crypto, AES-GCM).
- **EV-2** Derive keys via Argon2/PBKDF2 with sound parameters (tuned per device class).
- **EV-3** Store ciphertext only (IndexedDB); never persist plaintext or keys.
- **EV-4** Any sync transmits ciphertext only; short-lived tokens; least privilege.
- **EV-5** Communicate the recovery model (or its absence) explicitly in the UI.

## Capability detection & fallback
Requires Web Crypto + IndexedDB (broadly available). Argon2 typically ships as WASM; fall back to a
strong PBKDF2 iteration count if unavailable — **never a silent downgrade** of security.

## Acceptance criteria
- [ ] Stored bytes are ciphertext; no plaintext is observable at rest.
- [ ] Losing the passphrase makes data unrecoverable — and the UI warned the user up front.
- [ ] If sync exists, captured traffic contains only ciphertext.

## Dependencies
[Privacy & Security](../quality/privacy-security.md) · [Data Flow](../architecture/data-flow.md).

## Open questions
- Offer a recovery mechanism (e.g., a recovery code), or commit to zero-recovery by design?
- Argon2 parameters (memory/time) tuned for a mid-range phone?
