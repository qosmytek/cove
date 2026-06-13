// Pure conversion helpers for Cove Convert (ADR-0011): source-format detection, the output name,
// and the DuckDB SQL that drives a conversion. No DuckDB here, so these are unit-tested directly;
// the tool (tools/convert.ts) runs the SQL through AsyncDuckDB in a worker.

export type Format = 'csv' | 'json' | 'parquet';

export const FORMATS: Format[] = ['csv', 'json', 'parquet'];

const MIME: Record<Format, string> = {
  csv: 'text/csv',
  json: 'application/json',
  parquet: 'application/vnd.apache.parquet',
};

/** Best-effort source format from a filename; null if the extension isn't recognized. */
export function detectFormat(filename: string): Format | null {
  const ext = filename.toLowerCase().split('.').pop() ?? '';
  if (ext === 'csv' || ext === 'tsv') return 'csv';
  if (ext === 'json' || ext === 'ndjson') return 'json';
  if (ext === 'parquet' || ext === 'pq') return 'parquet';
  return null;
}

export const mimeFor = (format: Format): string => MIME[format];

/** Download name for the converted file — the source name with its extension swapped. */
export function outputName(inputName: string, target: Format): string {
  const base = inputName.replace(/\.[^.]+$/, '') || 'data';
  return `${base}.${target}`;
}

/**
 * DuckDB SQL converting the registered `inFile` to `outFile` as `target`. `read_*` auto-detects
 * schema/types. `inFile`/`outFile` are caller-controlled virtual filenames (never user input), so
 * there is nothing to escape here.
 */
export function conversionSql(
  source: Format,
  target: Format,
  inFile: string,
  outFile: string,
): string {
  const reader: Record<Format, string> = {
    csv: `read_csv('${inFile}', auto_detect=true)`,
    json: `read_json('${inFile}', auto_detect=true)`,
    parquet: `read_parquet('${inFile}')`,
  };
  const writer: Record<Format, string> = {
    csv: 'FORMAT csv, HEADER',
    json: 'FORMAT json, ARRAY true',
    parquet: 'FORMAT parquet',
  };
  return `COPY (SELECT * FROM ${reader[source]}) TO '${outFile}' (${writer[target]})`;
}
