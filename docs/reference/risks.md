# Risk Register

> **Status:** Draft · **Last updated:** 2026-06-06 · **Owner:** Victor Senna Seleimend
> **Section:** [Reference](./) · ← [Documentation Index](../README.md)

Top risks, their impact, and how we mitigate them. The biggest by far is **payload weight**.

## Scoring
Likelihood × Impact (each Low / Med / High). Owner: Victor Senna Seleimend; review dates to be assigned.

## Risks

### R1 — Payload weight (WASM + AI weights) 🔴 *top risk*
- **Impact:** High — a heavy app betrays the "fast" promise and loses users.
- **Likelihood:** High without discipline.
- **Mitigation:** lazy-load behind intent; cache aggressively; capability-detect; always keep a lighter
  fallback; enforce the [performance budget](../quality/performance-budget.md) in
  [CI](../engineering/ci-cd.md).

### R2 — `ffmpeg.wasm` too slow / memory-hungry on mid-range phones 🔴
- **Impact:** High — could invalidate the flagship.
- **Mitigation:** the **Phase 0 prototype proves this first** on a real device
  ([Roadmap](../product/roadmap.md)); tune threading/build; OPFS scratch; honest large-file limits. If
  it fails, re-pick the flagship ([Scope](../product/scope.md)).

### R3 — Capability fragmentation (FS Access, WebGPU, SharedArrayBuffer) 🟠
- **Impact:** Med/High — features unavailable or degraded on some browsers.
- **Mitigation:** capability detection + a tested fallback for every path
  ([Progressive Enhancement](../quality/progressive-enhancement.md)).

### R4 — Cross-origin isolation unavailable in some contexts 🟠
- **Impact:** Med — no `SharedArrayBuffer` → slower single-threaded path; affects `file://`
  [single-file](../features/02-single-file-app.md) builds.
- **Mitigation:** single-threaded fallback
  ([ADR-0002](../architecture/decisions/0002-web-workers-for-compute.md)); set COOP/COEP on the hosted app.

### R5 — Vault key management / data loss 🟠
- **Impact:** High for affected users — a lost passphrase means lost data.
- **Mitigation:** an explicit recovery model, or a clearly communicated deliberate absence; never
  persist plaintext or keys ([Encrypted Vault](../features/03-encrypted-vault.md)).

### R6 — Service-worker cache staleness 🟡
- **Impact:** Med — users stuck on an old version.
- **Mitigation:** versioned precache, clean activation, a clear update path
  ([Offline Strategy](../quality/offline-strategy.md)).

### R7 — Supply-chain compromise via a dependency 🟡
- **Impact:** High if it exfiltrates data.
- **Mitigation:** minimal deps; strict CSP `connect-src`; SRI; no third-party scripts; audits
  ([Privacy & Security](../quality/privacy-security.md)).

### R8 — "Minimal" reads as "unfinished" 🟡
- **Impact:** Med — perceived quality and credibility.
- **Mitigation:** invest the saved complexity budget in typography and spacing
  ([Calm by Design](../features/07-calm-design.md)).

### R9 — Memory limits on large data/video 🟡
- **Impact:** Med — crashes or failures on big inputs.
- **Mitigation:** stream / scratch via OPFS; push-down filters for data; honest limits and clear errors.

## Review
Revisit this register at each [phase](../product/roadmap.md) boundary, and whenever a new capability is
added.
