// Vendor the DuckDB extensions Cove Convert needs (json, parquet) SAME-ORIGIN so the converter
// loads them with ZERO egress. JSON and Parquet aren't in DuckDB's core wasm; by default DuckDB
// autoloads them from a CDN (extensions.duckdb.org), which would break the local-first promise.
// The tool sets `custom_extension_repository` to '<origin>/duckdb-ext', and DuckDB then requests
// '<base>/<version>/<platform>/<name>.duckdb_extension.wasm' — so we mirror exactly that path
// (validated end-to-end in spike/selfhost.mjs). Build-time download; output is gitignored.
import { existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';

// DuckDB engine version bundled in @duckdb/duckdb-wasm 1.33.x. RE-PIN ON UPGRADE: the runtime
// requests this exact version's path, so a mismatch 404s at convert time. `wasm_eh` matches the
// single-threaded `eh` build the tool forces — the multi-threaded `coi`/`wasm_threads` extension
// variant fails to link (shared-memory mismatch), so the converter pins `eh` (ADR-0011).
const VERSION = 'v1.5.1';
const PLATFORM = 'wasm_eh';
const EXTENSIONS = ['json', 'parquet'];

const base = `https://extensions.duckdb.org/${VERSION}/${PLATFORM}`;
const destDir = `public/duckdb-ext/${VERSION}/${PLATFORM}`;
mkdirSync(destDir, { recursive: true });

for (const ext of EXTENSIONS) {
  const dest = `${destDir}/${ext}.duckdb_extension.wasm`;
  if (existsSync(dest) && statSync(dest).size > 0) {
    console.log(`DuckDB extension cached: ${dest}`);
    continue;
  }
  const url = `${base}/${ext}.duckdb_extension.wasm`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  }
  writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
  console.log(`Vendored DuckDB extension: ${url} -> ${dest}`);
}
