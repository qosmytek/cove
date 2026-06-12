import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { PDFDocument, StandardFonts } from 'pdf-lib';

// A tiny in-memory PDF, so there's no committed binary fixture to maintain.
async function samplePdf(): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  doc.addPage([612, 792]).drawText('SECRET-12345', { x: 72, y: 600, size: 16, font });
  return Buffer.from(await doc.save());
}

test('redactor: load a PDF, mark a region, and save the redacted output', async ({ page }) => {
  // The File System Access save picker can't run headless; force the download fallback so the
  // save resolves deterministically (and Playwright can capture it).
  await page.addInitScript(() => {
    Object.defineProperty(window, 'showSaveFilePicker', { configurable: true, value: undefined });
  });

  await page.goto('/#/redact');
  await page.locator('#file').setInputFiles({
    name: 'sample.pdf',
    mimeType: 'application/pdf',
    buffer: await samplePdf(),
  });

  // The page renders to a canvas; add a redaction box via the keyboard-accessible button.
  await expect(page.locator('.page-wrap canvas')).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: 'Add box to page 1' }).click();
  await expect(page.locator('.mark')).toHaveCount(1);

  const downloadPromise = page.waitForEvent('download');
  await page.locator('#redact').click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toBe('redacted-sample.pdf');
  const bytes = await readFile(await download.path());
  expect(bytes.subarray(0, 5).toString()).toBe('%PDF-'); // a real PDF was produced
});
