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

## Outcome (2026-06-14): confirmed on the A54
The grid first ran on a **desktop CPU-throttled 6×** (a stand-in for a mid-range phone), then the chosen
setting was confirmed on the **physical A54** — which matched the proxy closely (predicted 997 ms,
measured **1023 ms**), retroactively validating the throttled-desktop approach. Proxy medians of 3:

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

**Chosen params** (within the ~1 s unlock budget, favoring memory-hardness):
- **Argon2id: m = 46 MiB, t = 1, p = 1** — **1023 ms on the A54** (an OWASP-recommended profile, more
  memory-hard than the 19 MiB/t2 floor). ~1 s for a once-per-session unlock is acceptable, so we keep it
  over the snappier 19 MiB/t2 alternative (~779 ms on the proxy).
- **PBKDF2 fallback: 1,000,000 iterations** (~413 ms on the proxy) — comfortably above the OWASP 600k floor.

Derivation runs off the main thread regardless. These are the live defaults in `src/vault.ts`
(`ARGON2_DEFAULTS` / `PBKDF2_DEFAULTS`); the spike is closed.
