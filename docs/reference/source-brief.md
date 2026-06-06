# Local-First Browser Tool (the "SaaS killer")

A fast, private, installable browser app that does its real work — media conversion, file transforms, data crunching — **entirely on the user's device**. There is no server to attack, no egress to pay for, and no file anyone has to "trust us" with.

## The anchor idea

**Local-first tool.** The whole pitch is the literal opposite of every "upload your file" SaaS: your data never leaves the device, so it can't be leaked.

Concrete examples of the tool itself:

- a browser **video compressor**
- a **PDF redactor**
- a **background remover**
- a **CSV ↔ JSON ↔ Parquet converter**

## What it delivers

The product is built by combining several of the source ideas. Each one below lists how to build it and the specific thing to watch out for.

### Local-first tool — the core
Do the heavy lifting in **WebAssembly**: `ffmpeg.wasm` for media, `sql.js` / DuckDB-WASM for data, Pyodide for Python libraries. Read and scratch-write local files with the **File System Access API + OPFS**, and push all compute into **Web Workers** so the main thread holds 60fps.
*Watch the weight:* lazy-load the engine only when a task actually starts, and test on a mid-range phone rather than your laptop.

### The single-file app
Ship a focused version inlined into one self-contained `.html` file (esbuild or `vite-plugin-singlefile`) that runs from an email attachment, a USB stick, or an air-gapped machine — and still opens a decade from now.
*Watch out:* there's no code-splitting, so keep it to a focused utility, not a sprawling app.

### Client-side encrypted vault
For tools that keep data — a private journal, notes, a password manager — encrypt in the browser with **Web Crypto** (Argon2 or PBKDF2 → AES-GCM) into **IndexedDB** before anything is persisted, syncing only ciphertext if needed.
*Watch out:* key management is the entire game. Be explicit about recovery, or about its deliberate absence — lose the passphrase and the data is gone.

### On-device AI (WebGPU)
Add private, zero-marginal-cost inference — smart autocomplete, an offline assistant, an image classifier — via `transformers.js` or WebLLM on **WebGPU**, with weights cached after first load.
*Watch out:* gate it behind explicit user intent; weights are hundreds of MB and the first load is slow.

### In-browser big-data exploration
Let users run real analytical SQL over millions of rows with **DuckDB-WASM** querying Parquet via **HTTP range requests**, so only the bytes a query needs are fetched. The "backend" is simply the user's own CPU.

### Offline-first PWA
Make it installable and fully functional offline with a **service worker** (precache the shell, stale-while-revalidate the content) — a genuine lifeline on poor or no connectivity.

### Calm by design
The privacy stance makes anti-engagement natural: no tracking, no dark patterns, no cookie banner (there's nothing to consent to), system fonts, no third-party scripts.
*Watch out:* spend the saved complexity budget on typography so "minimal" reads as intentional rather than unfinished.

### Also draws on…
**Command-palette navigation** (covered in depth under Product B) for keyboard-driven power-user control.

## Why it's disruptive

It markets privacy you **can't violate** rather than a policy you merely promise to keep. As a result it inherits zero storage and egress liability, no data-processing compliance burden, and the ability to serve a million users from a CDN for the price of serving a few.

## Biggest pitfall

**Payload weight.** WASM engines and model weights can dwarf the actual app, so:

- lazy-load them behind explicit user intent
- cache aggressively
- capability-detect (WebGPU, SharedArrayBuffer)
- always keep a lighter fallback

## Production requirements that matter most here

From the cross-cutting checklist that applies to every product, these bear most directly on this product:

- **Budget the megabytes for WASM and AI weights** — the single biggest risk for this product; lazy-load behind intent, cache, capability-detect, and keep a fallback.
- **Set a performance budget and enforce it in CI** — a "fast" tool that ships 3 MB of JavaScript isn't fast.
- **Build on progressive enhancement** — core actions should work before any heavy engine loads.
- **Make accessibility non-negotiable** — keyboard navigation, focus management, semantic HTML, contrast, reduced-motion support.
- **Plan graceful degradation** — if WebGPU fails, fall back to an API proxy or keyword path; if the heavy engine can't load, keep a lighter mode usable.
- **For any encrypted-vault sync, secure the data layer** — sync only ciphertext, never plaintext, and use short-lived tokens and least privilege.

## Where to start

Prototype the **riskiest technical piece first** — for this product that's usually the WASM tooling or the on-device model load. Prove it works on a real mid-range phone, then build outward. The most disruptive result comes from one strong idea executed exceptionally well, not from stacking everything at once.
