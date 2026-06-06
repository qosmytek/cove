# Data Flow

> **Status:** Draft · **Last updated:** 2026-06-06 · **Owner:** Victor Senna Seleimend
> **Section:** [Architecture](./) · ← [Documentation Index](../README.md)

How bytes move through the system — and, crucially, why user data **doesn't** move off the device.

## The golden rule
**User file bytes are read locally, processed locally, and written locally.** No code path sends them to
a server. The only network traffic is fetching **our own static assets** (shell + engines) from a CDN —
never user content. See [Privacy & Security](../quality/privacy-security.md).

## Inputs
| Source | Mechanism | Notes |
| ------ | --------- | ----- |
| User picks / drops a file | **File System Access API** / drag-drop | Returns a handle or blob; bytes stay local. |
| Fallback (unsupported) | `<input type="file">` | In-memory blob; still no upload. |
| Remote Parquet ([feature 05](../features/05-big-data-exploration.md)) | **HTTP range requests** | Fetches only needed byte ranges of a *remote data file* — not a user upload. |

## Processing
1. Shell hands the worker a file handle / blob.
2. Worker reads bytes (streaming where possible) into WASM memory or **OPFS scratch**.
3. WASM engine computes the result off the main thread.
4. Progress is posted back to the shell for display.

## Outputs
| Destination | Mechanism |
| ----------- | --------- |
| Save to disk | **File System Access API** write (fallback: browser **download**) |
| Persist (vault) | Encrypt → **IndexedDB** (ciphertext only) — see [feature 03](../features/03-encrypted-vault.md) |
| Cache engine for reuse | **Cache Storage** / OPFS (our asset, not user data) |

## What crosses the network vs. what never does
| Crosses the network | Never crosses the network |
| ------------------- | ------------------------- |
| App shell (HTML/CSS/JS) from CDN | User-selected file contents |
| WASM engines / AI weights from CDN | Derived results / outputs |
| Byte ranges of a *remote* Parquet the user chose to query | Vault plaintext or keys |
| (If vault sync ships) **ciphertext** only | Vault plaintext — ever |

## Verifiability
Because the guarantee is architectural, it is testable: with DevTools' network panel (or a CI network
assertion), performing any operation must show **no request carrying user file bytes**. See
[Testing Strategy](../engineering/testing-strategy.md) and the
[v1 acceptance criteria](../product/prd.md#7-acceptance-criteria-v1-done).

See also: [Architecture Overview](./overview.md) · [Privacy & Security](../quality/privacy-security.md)
