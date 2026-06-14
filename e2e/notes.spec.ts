import { expect, test } from '@playwright/test';

// End-to-end guard for Cove Notes (ADR-0012): create a vault, write an encrypted note, lock/unlock
// (rejecting the wrong passphrase), confirm it survives a reload (IndexedDB), that storage holds no
// plaintext, and that nothing leaves the origin. Exercises the real Argon2id default params.

const ORIGIN = 'http://localhost:4173';
const PASS = 'open sesame 123';

test('notes: create → encrypt → lock/unlock → persist, with zero egress', async ({ page }) => {
  test.setTimeout(60_000);
  const offOrigin: string[] = [];
  page.context().on('request', (req) => {
    const u = new URL(req.url());
    if (u.origin !== ORIGIN && u.protocol !== 'data:' && u.protocol !== 'blob:') {
      offOrigin.push(req.url());
    }
  });

  await page.goto('/#/notes');

  // Create the vault.
  await page.locator('#new-pass').fill(PASS);
  await page.locator('#confirm-pass').fill(PASS);
  await page.locator('#create').click();
  await expect(page.locator('#vault')).toBeVisible();

  // Write a note.
  await page.locator('#new-note').click();
  await page.locator('#note-title').fill('Grocery');
  await page.locator('#note-body').fill('oat milk, figs');
  await page.locator('#save-note').click();
  await expect(page.locator('.note-item')).toHaveText('Grocery');

  // Lock, then reject a wrong passphrase.
  await page.locator('#lock').click();
  await expect(page.locator('#locked')).toBeVisible();
  await page.locator('#unlock-pass').fill('wrong pass');
  await page.locator('#unlock').click();
  await expect(page.locator('#locked-msg')).toHaveText('Wrong passphrase.');

  // Unlock and confirm the note round-trips.
  await page.locator('#unlock-pass').fill(PASS);
  await page.locator('#unlock').click();
  await expect(page.locator('#vault')).toBeVisible();
  await page.locator('.note-item', { hasText: 'Grocery' }).click();
  await expect(page.locator('#note-body')).toHaveValue('oat milk, figs');

  // Survives a reload (IndexedDB), still locked.
  await page.reload();
  await expect(page.locator('#locked')).toBeVisible();
  await page.locator('#unlock-pass').fill(PASS);
  await page.locator('#unlock').click();
  await expect(page.locator('.note-item', { hasText: 'Grocery' })).toBeVisible();

  // Ciphertext at rest: IndexedDB holds no plaintext.
  const stored = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((res, rej) => {
      const r = indexedDB.open('cove-vault');
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    return await new Promise<string>((res, rej) => {
      const r = db.transaction('notes').objectStore('notes').getAll();
      r.onsuccess = () => res(JSON.stringify(r.result));
      r.onerror = () => rej(r.error);
    });
  });
  expect(stored).not.toContain('oat milk');

  await page.waitForLoadState('networkidle');
  expect(offOrigin, `off-origin: ${offOrigin.join(', ')}`).toEqual([]);
});
