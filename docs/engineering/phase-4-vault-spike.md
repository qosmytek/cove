# Phase 4 — Vault Spike (Argon2id timing on the reference device)

> **Status:** Draft · **Last updated:** 2026-06-14 · **Owner:** Victor Senna Seleimend
> **Section:** [Engineering](./) · ← [Documentation Index](../README.md)

The riskiest-first spike for the [encrypted vault](../features/03-encrypted-vault.md) (Phase 4's lead
tool), validating [ADR-0012](../architecture/decisions/0012-encrypted-vault-crypto.md) **before the UI** —
the converter's and redactor's equivalent. The crypto stack itself (AES-256-GCM via Web Crypto, Argon2id
via WASM) is proven; the one real unknown is **parameter tuning**: which Argon2id cost is *secure yet
tolerable* on the mid-range [reference A54](./testing-strategy.md)?

## What it measures
Argon2id derive-time across a grid of (memory, iterations, parallelism) settings, on the A54 in-browser,
plus the PBKDF2-fallback iteration count that hits the same target. We want the **highest cost that stays
under an interactive budget** (target ≈ 0.5–1.0 s to unlock on the A54), at or above the OWASP argon2id
floor (m ≥ 19 MiB, t ≥ 2, p = 1).

## Method
`spike/argon2-bench.html` (gitignored, like the Phase 0 / converter prototypes) runs `hash-wasm`'s
argon2id over the grid and prints a median-of-3 timing table, then sweeps PBKDF2 (Web Crypto) for the
matching iteration count. Serve it (e.g. `npx serve spike`) and open on the **physical A54** over LAN;
record the medians.

## Outcome (pending — run on the A54)
- [ ] Chosen argon2id params (m / t / p) with median derive-time on the A54.
- [ ] PBKDF2-fallback iteration count for the same target.
- [ ] Confirm unlock stays responsive (derivation off the main thread) and memory fits the A54 budget (R9).

Once measured, the params land in the vault implementation and this section records the numbers — the way
[Phase 0](./phase-0-measurement.md) recorded its engine measurements.
