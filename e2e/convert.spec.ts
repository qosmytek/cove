import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

// Standing guard for the data converter's two acceptance criteria that the round-trip spike could
// only prove once (DC-7 fidelity + "zero network requests"): drive the real app through
// CSV -> Parquet -> CSV and assert the data survives AND nothing leaves the origin — in particular
// that the json/parquet DuckDB extensions load from our same-origin /duckdb-ext, never the CDN.

const ORIGIN = 'http://localhost:4173';
const CSV = 'id,name\n1,Alice\n2,Bob\n3,Carol\n';
const rows = (s: string) =>
  s
    .trim()
    .split('\n')
    .map((l) => l.trim())
    .sort();

test('converter: CSV → Parquet → CSV round-trips on-device with zero egress', async ({ page }) => {
  test.setTimeout(120_000);
  // The FS Access save picker can't run headless; force the download fallback. And auto-accept the
  // one-time engine-size confirm so the first conversion proceeds.
  await page.addInitScript(() => {
    Object.defineProperty(window, 'showSaveFilePicker', { configurable: true, value: undefined });
  });
  page.on('dialog', (d) => d.accept());

  // Context-level so requests from the DuckDB *worker* (engine + extensions) are captured too.
  const offOrigin: string[] = [];
  page.context().on('request', (req) => {
    const url = new URL(req.url());
    if (url.origin !== ORIGIN && url.protocol !== 'data:' && url.protocol !== 'blob:') {
      offOrigin.push(req.url());
    }
  });

  await page.goto('/#/convert');
  await expect(page.locator('#dropzone')).toBeVisible();

  // 1) CSV -> Parquet (exercises the parquet extension + a real engine instantiate).
  await page.locator('#file').setInputFiles({
    name: 'sample.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(CSV),
  });
  await expect(page.locator('#panel')).toBeVisible();
  await page.locator('#target').selectOption('parquet');
  const parquetDownload = page.waitForEvent('download', { timeout: 90_000 });
  await page.locator('#convert').click();
  const parquet = await parquetDownload;
  expect(parquet.suggestedFilename()).toBe('sample.parquet');
  const parquetBytes = await readFile(await parquet.path());
  expect(parquetBytes.subarray(0, 4).toString()).toBe('PAR1'); // a real Parquet file was produced

  // 2) Parquet -> CSV (feed the just-produced file back in; engine is already warm).
  await page.locator('#file').setInputFiles({
    name: 'sample.parquet',
    mimeType: 'application/octet-stream',
    buffer: parquetBytes,
  });
  await expect(page.locator('#fileinfo')).toContainText('Parquet');
  await page.locator('#target').selectOption('csv');
  const csvDownload = page.waitForEvent('download', { timeout: 60_000 });
  await page.locator('#convert').click();
  const csv = await csvDownload;
  expect(csv.suggestedFilename()).toBe('sample.csv');

  // DC-7: the round-tripped rows equal the original (order-independent).
  const roundTripped = (await readFile(await csv.path())).toString();
  expect(rows(roundTripped)).toEqual(rows(CSV));

  // Zero egress: nothing left the origin — so the extensions loaded from same-origin, not the CDN.
  await page.waitForLoadState('networkidle');
  expect(offOrigin, `unexpected off-origin requests: ${offOrigin.join(', ')}`).toEqual([]);
});
