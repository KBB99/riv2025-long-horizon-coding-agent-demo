import { test, expect } from '@playwright/test';

test('create issue modal opens and has form fields', async ({ page }) => {
  await page.goto('http://localhost:6174');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  // Click the Create button
  const createButton = page.getByRole('button', { name: /Create/i }).first();
  await expect(createButton).toBeVisible();
  await createButton.click();

  // Wait for modal
  await page.waitForTimeout(500);

  // Check modal is visible
  const modal = page.locator('[role="dialog"]');
  await expect(modal).toBeVisible();

  // Check for form fields
  await expect(page.getByRole('heading', { name: 'Create Issue' })).toBeVisible();
});
