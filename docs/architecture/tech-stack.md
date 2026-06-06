# Tech Stack

> **Status:** Draft · **Last updated:** 2026-06-06 · **Owner:** Victor Senna Seleimend
> **Section:** [Architecture](./) · ← [Documentation Index](../README.md)

Chosen technologies and the reason for each. Significant or contested choices are also recorded as
[ADRs](./decisions/README.md).

## Principles
- Prefer **platform / browser APIs** over dependencies.
- Every byte in the **initial** payload must justify itself; heavy things load lazily.
- Choose tech that has a **fallback** path (capability detection).

## Compute (WebAssembly)
| Need | Choice | Notes |
| ---- | ------ | ----- |
| Media (video compressor, v1) | **`ffmpeg.wasm`** | Riskiest/heaviest engine; lazy-loaded on intent. Build/threading per [ADR-0006](./decisions/0006-ffmpeg-build-and-threading.md). |
| Data / SQL | **DuckDB-WASM**, `sql.js` | Analytical SQL over Parquet — see [feature 05](../features/05-big-data-exploration.md). |
| Python libraries | **Pyodide** | Only if/when a tool needs the Python ecosystem. |
| On-device AI | **`transformers.js`** / **WebLLM** on **WebGPU** | Phase 4; weights cached after first load. |

## Storage & files
| Need | Choice |
| ---- | ------ |
| Read/save user files | **File System Access API** (fallback: `<input type="file">` + download) |
| Fast scratch space | **OPFS** |
| Encrypted persistence | **IndexedDB** (ciphertext only) |
| Offline asset cache | **Cache Storage** (via service worker) |

## Crypto
**Web Crypto** — **AES-GCM** for encryption, **Argon2** (WASM) or **PBKDF2** for key derivation. See
[Encrypted Vault](../features/03-encrypted-vault.md).

## Concurrency
**Web Workers** for all heavy compute; **`SharedArrayBuffer`** where cross-origin isolation allows, else
single-threaded. See [ADR-0002](./decisions/0002-web-workers-for-compute.md).

## UI
Lightweight, **semantic HTML** with **system fonts**. The framework choice (or going framework-free) is
deliberately deferred to its own ADR and judged against the
[performance budget](../quality/performance-budget.md): it must not threaten the initial-payload budget
or accessibility.

## Build & distribution
- **Vite** (dev/build) + **esbuild**; **`vite-plugin-singlefile`** for the
  [single-file build](../features/02-single-file-app.md).
- **Service worker** + **web app manifest** for the [PWA](../features/06-offline-pwa.md).
- Static hosting on a **CDN** with **COOP/COEP** headers for cross-origin isolation.

## Explicitly avoided
- Analytics SDKs, third-party scripts, tag managers, ad tech — see
  [Calm by Design](../features/07-calm-design.md).
- Any backend application server or user database — see
  [ADR-0005](./decisions/0005-no-server-no-account.md).

## Open decisions (future ADRs)
- UI framework (or none).
- Test runner + E2E tooling — see [Testing Strategy](../engineering/testing-strategy.md).
