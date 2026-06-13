import { describe, expect, it } from 'vitest';
import { conversionSql, detectFormat, outputName } from '../src/conversion';

// The conversion's pure logic (format detection + the DuckDB SQL it runs). The actual engine
// round-trip is validated by the Phase 3 spike (docs/engineering/phase-3-converter-spike.md) and,
// in-browser, by e2e — not here, to keep the unit suite off the ~35 MB WASM.

describe('detectFormat', () => {
  it('maps known extensions, case-insensitively', () => {
    expect(detectFormat('data.csv')).toBe('csv');
    expect(detectFormat('X.TSV')).toBe('csv');
    expect(detectFormat('a.json')).toBe('json');
    expect(detectFormat('a.ndjson')).toBe('json');
    expect(detectFormat('a.parquet')).toBe('parquet');
    expect(detectFormat('a.pq')).toBe('parquet');
  });
  it('returns null for unknown extensions', () => {
    expect(detectFormat('a.xlsx')).toBeNull();
    expect(detectFormat('noext')).toBeNull();
  });
});

describe('outputName', () => {
  it('swaps the extension to the target format', () => {
    expect(outputName('sales.csv', 'parquet')).toBe('sales.parquet');
    expect(outputName('export.parquet', 'json')).toBe('export.json');
    expect(outputName('noext', 'csv')).toBe('noext.csv');
  });
});

describe('conversionSql', () => {
  it('pairs the right reader and writer', () => {
    expect(conversionSql('csv', 'parquet', 'in.csv', 'out.parquet')).toBe(
      "COPY (SELECT * FROM read_csv('in.csv', auto_detect=true)) TO 'out.parquet' (FORMAT parquet)",
    );
    expect(conversionSql('parquet', 'json', 'in.parquet', 'out.json')).toContain(
      "read_parquet('in.parquet')",
    );
    expect(conversionSql('json', 'csv', 'in.json', 'out.csv')).toContain('FORMAT csv, HEADER');
  });
});
