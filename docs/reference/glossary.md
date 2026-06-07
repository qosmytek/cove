# Glossary

> **Status:** Draft · **Last updated:** 2026-06-06 · **Owner:** Victor Senna Seleimend
> **Section:** [Reference](./) · ← [Documentation Index](../README.md)

Plain-language definitions of the terms and acronyms used across these docs.

| Term | Meaning |
| ---- | ------- |
| **AES-GCM** | An authenticated symmetric encryption algorithm (via the Web Crypto API) used to encrypt vault data. |
| **Argon2** | A modern, memory-hard password-hashing / key-derivation function; preferred over PBKDF2. |
| **CDN** | Content Delivery Network — distributed servers that serve our *static* assets (never user data). |
| **COOP/COEP** | Cross-Origin-Opener-Policy / Cross-Origin-Embedder-Policy headers that enable **cross-origin isolation**. |
| **Cross-origin isolation** | A secure browser state required to use `SharedArrayBuffer` (and thus multi-threaded WASM). |
| **CSP** | Content Security Policy — browser rules restricting what the page may load or connect to. |
| **DuckDB-WASM** | An in-browser build of the DuckDB analytical database; runs SQL over local/remote data. |
| **`ffmpeg.wasm`** | A WebAssembly build of FFmpeg; the video compressor's universal **fallback** engine. |
| **FS Access API** | File System Access API — lets the page read/write user-chosen files locally. |
| **HTTP range request** | A request for only a byte range of a file, so big remote files aren't fully downloaded. |
| **IndexedDB** | A browser database for structured client-side storage (we store ciphertext in it). |
| **OPFS** | Origin Private File System — fast, sandboxed, per-origin scratch storage. |
| **Parquet** | A columnar file format efficient for analytical queries. |
| **PBKDF2** | A widely supported key-derivation function; our fallback when Argon2 isn't available. |
| **Progressive enhancement** | Build a working base first, then layer on enhancements where supported. |
| **PWA** | Progressive Web App — an installable, offline-capable web app. |
| **Pyodide** | A WebAssembly build of Python and scientific libraries, runnable in the browser. |
| **Service worker** | A background script enabling offline caching and installability. |
| **`SharedArrayBuffer`** | Shared memory enabling multi-threaded WASM; requires cross-origin isolation. |
| **`sql.js`** | A WebAssembly build of SQLite for the browser. |
| **SRI** | Subresource Integrity — hashes ensuring a fetched asset wasn't tampered with. |
| **`transformers.js`** | A library for running ML models in the browser (CPU / WebGPU). |
| **WASM** | WebAssembly — a fast, portable binary instruction format that runs in the browser. |
| **Web Crypto** | The browser's native cryptography API. |
| **WebCodecs** | Browser API exposing the device's hardware video codecs (`VideoEncoder`/`VideoDecoder`); the video compressor's fast path. |
| **WebGPU** | A modern browser GPU API; enables fast on-device AI inference. |
| **WebLLM** | A project for running large language models in the browser on WebGPU. |
| **Web Worker** | A background thread for running code (e.g., WASM compute) off the main UI thread. |

See also: [Tech Stack](../architecture/tech-stack.md) · [Architecture Overview](../architecture/overview.md)
