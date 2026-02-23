import { test, expect } from '@playwright/test';

test('screenshot create issue modal', async ({ page }) => {
  await page.goto('http://localhost:6174');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  // Click the Create button
  const createButton = page.getByRole('button', { name: /Create/i }).first();
  await createButton.click();
  await page.waitForTimeout(500);

  // Take screenshot with modal open
  await page.screenshot({ path: 'screenshots/issue-28/create-issue-modal-open.png' });
});

test('screenshot search modal', async ({ page }) => {
  await page.goto('http://localhost:6174');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  // Open search with keyboard shortcut
  await page.keyboard.press('Control+k');
  await page.waitForTimeout(500);

  // Take screenshot with modal open
  await page.screenshot({ path: 'screenshots/issue-28/search-modal-open.png' });
});
