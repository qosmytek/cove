# 03 · Encrypted Vault

> **Status:** Draft · **Last updated:** 2026-06-14 · **Owner:** Victor Senna Seleimend
> **Section:** [Features](./README.md) · **In v1:** ⏳ Phase 4
> ← [Feature index](./README.md)

## Summary
For tools that **keep** data — a private journal, notes, a password manager — encrypt **in the browser**
before anything is persisted, and sync only ciphertext if sync is ever offered.

## User value
Persistent, private data the user fully controls. Even if local storage or any future sync server were
compromised, the attacker gets ciphertext.

## How we build it
- Derive a key-encryption key from the passphrase with **Argon2id** (WASM, via `hash-wasm`), falling
  back to **PBKDF2-HMAC-SHA-256** (Web Crypto) where WASM can't run — never a silent downgrade. Params
  are tuned on the reference device ([vault spike](../engineering/phase-4-vault-spike.md)).
- That key wraps a per-vault **random data key**; records are encrypted with **AES-256-GCM** (Web Crypto),
  a fresh IV each ([ADR-0012](../architecture/decisions/0012-encrypted-vault-crypto.md)).
- Persist **ciphertext** to **IndexedDB**. Plaintext and keys exist only transiently in memory.
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
Requires Web Crypto + IndexedDB (broadly available). Argon2id ships as WASM; fall back to a high PBKDF2
iteration count if unavailable — **never a silent downgrade** of security
([ADR-0012](../architecture/decisions/0012-encrypted-vault-crypto.md)).

## Acceptance criteria
- [ ] Stored bytes are ciphertext; no plaintext is observable at rest.
- [ ] Losing the passphrase makes data unrecoverable — and the UI warned the user up front.
- [ ] If sync exists, captured traffic contains only ciphertext.

## Build status (2026-06-14)
**Cove Notes** ships as the vault's first tool (Phase 4): set a passphrase — with the blunt
zero-recovery warning — then unlock and write notes encrypted on-device with the vault core
(`src/vault.ts`), stored ciphertext-only in IndexedDB (`src/vault-store.ts`); title, body, and timestamp
all sit inside the encrypted payload. The crypto is unit-tested and a standing e2e (`e2e/notes.spec.ts`)
covers create → encrypt → lock/unlock (wrong-passphrase rejected) → reload-persistence →
ciphertext-at-rest → zero egress. The Argon2id params (**46 MiB / t1**, measured **1023 ms on the
reference A54**) are confirmed ([vault spike](../engineering/phase-4-vault-spike.md)).

## Dependencies
[Privacy & Security](../quality/privacy-security.md) · [Data Flow](../architecture/data-flow.md) ·
[ADR-0012](../architecture/decisions/0012-encrypted-vault-crypto.md) ·
[Vault Spike](../engineering/phase-4-vault-spike.md).

## Open questions
- **Resolved (2026-06-14):** **zero-recovery by design** — a lost passphrase is unrecoverable and the
  first-run UI says so up front; no recovery code in v1 (an opt-in offline one is
  [backlog](../product/backlog.md)). See [ADR-0012](../architecture/decisions/0012-encrypted-vault-crypto.md).
- **Resolved (2026-06-14):** Argon2id parameters come from the
  [vault spike](../engineering/phase-4-vault-spike.md) on the reference A54 (secure-yet-tolerable), with
  the PBKDF2-fallback count set independently.
