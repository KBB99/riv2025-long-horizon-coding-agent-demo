import { test, expect } from '@playwright/test';

test('Screenshot Create Issue Modal with AC field', async ({ page }) => {
  await page.goto('http://localhost:6174');
  await page.waitForLoadState('networkidle');
  await page.click('button:has-text("Create")');
  await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
  await page.waitForSelector('[data-testid="acceptance-criteria-input"]', { timeout: 5000 });
  await page.screenshot({ path: 'screenshots/issue-31/ac-create-modal-open.png', fullPage: true });
});
