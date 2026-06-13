// Vendor the single-threaded DuckDB-WASM `eh` engine into public/duckdb/ so Cove Convert loads it
// same-origin (zero egress, COEP-friendly) — like the ffmpeg cores. We ship only `eh`, not the
// multi-threaded `coi` build: `coi` can't link DuckDB's json/parquet extensions (shared-memory
// mismatch) and the converter needs them, so forcing `eh` is the working path (ADR-0011). The
// extensions themselves are vendored by scripts/fetch-duckdb-extensions.mjs. Output is gitignored.

import { cpSync, existsSync, mkdirSync } from 'node:fs';

const src = 'node_modules/@duckdb/duckdb-wasm/dist';
const dest = 'public/duckdb';
const files = ['duckdb-eh.wasm', 'duckdb-browser-eh.worker.js'];

if (!existsSync(src)) {
  throw new Error(
    `Could not find ${src} — is @duckdb/duckdb-wasm installed? (run \`npm install\`)`,
  );
}
mkdirSync(dest, { recursive: true });
for (const f of files) cpSync(`${src}/${f}`, `${dest}/${f}`);
console.log(`Copied DuckDB-WASM (eh) engine: ${src} -> ${dest} (${files.join(', ')})`);
