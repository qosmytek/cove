# Risk Register

> **Status:** Draft · **Last updated:** 2026-06-14 · **Owner:** Victor Senna Seleimend
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

### R2 — Software `ffmpeg.wasm` too slow / memory-hungry on mid-range phones 🟠 *(mitigated in Phase 0)*
- **Impact:** High — would invalidate the flagship if it were the only engine.
- **Mitigation:** **Resolved in Phase 0** — software `ffmpeg.wasm` is too slow for 1080p on mid-range
  (~4× real-time), so the flagship uses the **WebCodecs hardware fast path** (~real-time) with
  `ffmpeg.wasm` only as a **fallback** ([ADR-0007](../architecture/decisions/0007-video-engine-webcodecs-with-ffmpeg-fallback.md)).
  Residual: keep the fallback's large-file/memory behavior honest (OPFS scratch, clear limits).

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

### R10 — Incomplete redaction (recoverable content) 🟠 *(enters Phase 3)*
- **Impact:** High — a redactor that leaves blacked-out text selectable or images embedded is a privacy
  failure and destroys trust; worst case for [Dr. Lee](../product/personas.md)'s compliance use.
- **Likelihood:** Med without discipline — it is the most common PDF-redaction bug.
- **Mitigation:** **rasterize-and-rebuild** so removal is provable by construction — redacted pages
  become flattened images and the output is rebuilt fresh (dropping history, scripts, and attachments);
  strip metadata by default, and **assert in tests** that no marked text survives
  ([ADR-0010](../architecture/decisions/0010-pdf-redaction-engine.md) /
  [PDF Redactor](../features/09-pdf-redactor.md)).

### R11 — Lossy or incorrect data conversion 🟠 *(enters Phase 3)*
- **Impact:** Med/High — a converter that silently coerces types, loses precision, or drops rows
  produces wrong data the user may trust; erodes the tool's credibility.
- **Likelihood:** Med — type inference (CSV has no types), integer/float precision, and JSON nesting
  are the usual traps.
- **Mitigation:** pin sensible inference defaults and disclose them; **verify round-trips in tests**
  (CSV → Parquet → CSV preserves rows and values) — [Data Converter](../features/10-data-converter.md) /
  [ADR-0011](../architecture/decisions/0011-data-converter-engine.md).

### R12 — AI model-weight provenance & egress 🟠 *(enters Phase 4)*
- **Impact:** High — weights are large and must load from somewhere; the default behavior of model
  libraries (e.g. `transformers.js`) is to autoload from a third-party hub CDN, which would breach the
  local-first/offline promise and widen the supply-chain surface (cf. R7). It is the DuckDB-extension
  egress trap again, at ~10× the size.
- **Likelihood:** Med — it is the out-of-the-box behavior unless explicitly prevented.
- **Mitigation:** vendor weights **same-origin** (or a single **explicit, disclosed, opt-in** download —
  never silent), **pin + integrity-check** them, keep CSP `connect-src` tight, and cache for offline
  reuse ([On-Device AI](../features/04-on-device-ai.md); the AI-runtime ADR will pin the choice).

## Review
Revisit this register at each [phase](../product/roadmap.md) boundary, and whenever a new capability is
added.

**Phase 1 → 2 boundary (2026-06-09):** R2 resolved in Phase 0 (WebCodecs fast path). R3 (capability
fragmentation) and R4 (cross-origin isolation) are the focus of Phase 2's shell capability layer; R6
(SW staleness) is mitigated in v1 via silent, versioned updates. R1 (payload weight) remains the top
watch for the Phase 2 single-file build.

**Phase 2 → 3 boundary (2026-06-10):** R3 and R4 are now **actively mitigated by shipped code** — the
shell's capability-detection service plus a shared fallback-notice region landed in Phase 2. R6 saw a
real event: a service-worker precache regression was caught, fixed, and **guarded with an e2e
SW-registration assertion**. R1 stays the top watch as Phase 3 opens: the **PDF redactor** is the lead
tool partly *because* its engine is lighter than ffmpeg, and it becomes the first
[single-file](../features/02-single-file-app.md) `file://` target (R1 + R4). New for Phase 3: **R10**
(incomplete redaction), above.

**Phase 3 — data converter (2026-06-11):** the converter ("Cove Convert") adds **DuckDB-WASM** (~35 MB,
≈7.7 MB gzipped), so R1 (payload) applies — it is lazy/intent-gated and **not** a single-file target
([ADR-0011](../architecture/decisions/0011-data-converter-engine.md)). New: **R11** (lossy/incorrect
conversion), above; R9 (memory on large data) becomes active for the first time.

**Update (2026-06-13):** JSON/Parquet are DuckDB *extensions* that DuckDB autoloads from a CDN by
default — a latent egress hole. Closed by vendoring them same-origin (single-threaded `eh`; the
multi-threaded `coi` build can't link them). Both fidelity (DC-7) and the zero-egress claim are now
held by a standing **converter e2e** (`e2e/convert.spec.ts`), not just the spike. One maintenance
watch: the extension version is pinned to the `@duckdb/duckdb-wasm` build and guarded by a build-time
tripwire (`scripts/fetch-duckdb-extensions.mjs`) — re-validate on upgrade.

**Phase 3 → 4 boundary (2026-06-14):** Phase 3 shipped three tools (compressor, redactor, converter),
all CI-green; R10 (incomplete redaction) and R11 (lossy conversion) are mitigated by shipped code and
standing tests. Phase 4 (lead: the encrypted vault, then on-device AI) shifts the register:
- **R1 (payload) goes acute** — AI weights are **hundreds of MB**, the heaviest payload yet; the usual
  discipline (lazy, intent-gated, size disclosed, cached, lighter fallback) holds with far less headroom.
- **R3 (capability fragmentation)** activates for **WebGPU** — the AI feature depends on it, so the
  fallback is designed before the feature.
- **R5 (vault key management / data loss)** activates — the vault leads Phase 4; its **recovery model**
  (a real mechanism vs. a deliberate, well-communicated zero-recovery) is settled up front.
- **New — R12 (model-weight provenance & egress)**, above — the DuckDB-extension egress lesson applied
  to AI weights.
