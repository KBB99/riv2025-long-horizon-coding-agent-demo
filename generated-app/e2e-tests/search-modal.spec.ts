import { test, expect } from '@playwright/test';

test('search modal opens on search bar click', async ({ page }) => {
  await page.goto('http://localhost:6174');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  // Click the search bar
  const searchBar = page.locator('button', { hasText: /Search/i }).first();
  await expect(searchBar).toBeVisible();
  await searchBar.click();

  // Wait for search modal
  await page.waitForTimeout(500);

  // Check for search input/dialog
  const dialog = page.locator('[role="dialog"]');
  await expect(dialog).toBeVisible();
});
