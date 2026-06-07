import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const ORIGIN = 'http://localhost:4173';

test('shell loads and reports capabilities before any engine', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Cove/);
  await expect(page.locator('#status')).toContainText('crossOriginIsolated');
});

test('no egress: nothing leaves the origin on load', async ({ page }) => {
  const offOrigin: string[] = [];
  page.on('request', (req) => {
    const url = new URL(req.url());
    // Allow same-origin assets and in-memory data/blob URLs; flag anything else.
    if (url.origin !== ORIGIN && url.protocol !== 'data:' && url.protocol !== 'blob:') {
      offOrigin.push(req.url());
    }
  });
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  expect(offOrigin, `unexpected off-origin requests: ${offOrigin.join(', ')}`).toEqual([]);
});

test('a11y: no critical axe violations on the shell', async ({ page }) => {
  await page.goto('/');
  const { violations } = await new AxeBuilder({ page }).analyze();
  const critical = violations.filter((v) => v.impact === 'critical');
  expect(critical, JSON.stringify(critical.map((v) => v.id))).toEqual([]);
});
