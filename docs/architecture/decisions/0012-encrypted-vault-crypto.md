# ADR-0012 · Encrypted vault: client-side crypto for data-keeping tools

> **Status:** Accepted · **Date:** 2026-06-14 · **Owner:** Victor Senna Seleimend · ← [ADR index](./README.md)

## Context
Phase 4's [encrypted vault](../../features/03-encrypted-vault.md) gives data-*keeping* tools (a journal,
notes, a password manager) persistent storage that stays private even if the device or any future sync
server is compromised. It must encrypt **in the browser** before anything is persisted, store ciphertext
only, and hold no server-side key — consistent with [no server, no account](./0005-no-server-no-account.md).
The open decisions: the key-derivation function, the cipher, where ciphertext lives, and — the weightiest
— whether a lost passphrase is **recoverable**.

Options weighed for key derivation: **Argon2id** (memory-hard, the modern standard, resists GPU/ASIC
brute force) vs. **PBKDF2** (native in Web Crypto, but only CPU-hard). For recovery: a **recovery
mechanism** (e.g. an offline recovery code) vs. **zero-recovery by design**.

## Decision
- **Key derivation: Argon2id** (WASM, via `hash-wasm`), with **PBKDF2-HMAC-SHA-256 via Web Crypto as the
  fallback** where WASM can't run — **never a silent downgrade**; the UI states which is in use. Params
  are tuned on the reference device ([vault spike](../../engineering/phase-4-vault-spike.md)), starting
  from OWASP argon2id floors.
- **Cipher: AES-256-GCM via Web Crypto**, a fresh random 96-bit IV per record. The passphrase-derived key
  is a **key-encryption key** that wraps a per-vault **random data key** (envelope encryption) — so a
  passphrase change re-wraps the data key instead of re-encrypting every record.
- **Storage: ciphertext only, in IndexedDB.** Plaintext and the derived/data keys exist only transiently
  in memory (in a Worker where practical); never logged, synced, or persisted.
- **Recovery: zero-recovery by design.** No backdoor, no recovery code — a lost passphrase means the data
  is unrecoverable, and the first-run UI says so plainly **before** the user commits anything (EV-5).
  This keeps the threat model to a single secret with no recovery surface to store or attack, and matches
  the local-first, no-server ethos. An **opt-in** offline recovery code is recorded as possible future
  work ([backlog](../../product/backlog.md)), not v1 — the envelope design above keeps that door open.
- A **riskiest-first spike** measures Argon2id timing on the
  [reference A54](../../engineering/testing-strategy.md) to pick secure-yet-tolerable params before the
  UI is built.

## Consequences
- ✅ Ciphertext at rest with a memory-hard KDF; a full IndexedDB/device dump yields only ciphertext.
- ✅ Zero server, zero egress — encryption is entirely client-side; any future sync transmits ciphertext
  only ([Privacy & Security](../../quality/privacy-security.md)).
- ✅ Simple, auditable threat model: one secret (the passphrase), no recovery surface.
- ⚙️ **Argon2id is WASM**, lazy-loaded with the vault tool, with the native PBKDF2 fallback so the vault
  still works (at a higher iteration count) where WASM can't run (R3).
- ⚠️ **Zero-recovery is unforgiving (R5)** — a forgotten passphrase is permanent data loss; mitigated by
  blunt up-front disclosure, not a backdoor. A deliberate, communicated absence, not an oversight.
- ⚠️ **Param tuning (R5/R9)** — too-weak Argon2 params undercut the feature; too-strong locks out slow
  phones. The spike sets a device-appropriate floor; the PBKDF2-fallback count is set independently.
- 🔗 Realizes [Encrypted Vault](../../features/03-encrypted-vault.md); builds on
  [no server, no account](./0005-no-server-no-account.md); the first Phase 4 tool.
