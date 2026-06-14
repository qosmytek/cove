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

## Outcome (2026-06-14): provisional — desktop at 6× CPU throttle
The physical A54 wasn't to hand, so the grid ran on a **desktop CPU-throttled 6×** — a reasonable stand-in
for a mid-range phone (likely *pessimistic* on raw CPU, but it doesn't model the phone's lower memory
bandwidth, so the high-memory rows carry the most proxy→device uncertainty). Treat as provisional and
spot-check on the A54 at build time. Medians of 3:

| Argon2id (m / t / p) | median ms |
| --- | --- |
| 19 MiB / 2 / 1 | **779** |
| 19 MiB / 3 / 1 | 1214 |
| 32 MiB / 2 / 1 | 1379 |
| 46 MiB / 1 / 1 | **997** |
| 46 MiB / 2 / 1 | 2067 |
| 64 MiB / 2 / 1 | 2783 |
| 64 MiB / 3 / 1 | 4046 |

PBKDF2-HMAC-SHA-256 fallback: 300k → 142 ms · 600k → 245 ms · **1M → 413 ms** · 1.5M → 608 ms.

**Provisional params** (within the ~1 s budget, favoring memory-hardness):
- **Argon2id: m = 46 MiB, t = 1, p = 1** (~997 ms) — an OWASP-recommended profile, more memory-hard than
  the 19 MiB/t2 floor. It sits at the budget edge and high-memory cost is the least predictable across the
  proxy→phone gap, so **confirm on the A54**; fall back to **m = 19 MiB, t = 2, p = 1** (~779 ms) if the
  device exceeds ~1.2 s.
- **PBKDF2 fallback: 1,000,000 iterations** (~413 ms) — comfortably above the OWASP 600k floor, with
  headroom for a slower device.

Derivation runs off the main thread (Worker) regardless. These params land in the vault build; the one
item still owed to this spike is a **build-time A54 spot-check** to confirm or nudge them.
