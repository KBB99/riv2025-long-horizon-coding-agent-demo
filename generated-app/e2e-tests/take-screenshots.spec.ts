import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:6174';
const PROJECT_ID = 'c73dbae5-0111-46b6-99fa-5ba3ad60fbe2';

test('create-issue-modal screenshot', async ({ page }) => {
  await page.goto(`${BASE_URL}/project/${PROJECT_ID}/board`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  // Press 'c' to open create issue modal
  await page.keyboard.press('c');
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'screenshots/issue-29/create-issue-modal-pw.png' });
});

test('search-modal screenshot', async ({ page }) => {
  await page.goto(`${BASE_URL}/project/${PROJECT_ID}/board`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  // Press Cmd+K to open search
  await page.keyboard.press('Meta+k');
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'screenshots/issue-29/search-modal-pw.png' });
});

test('dark-theme screenshot', async ({ page }) => {
  await page.goto(BASE_URL);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  // Click the theme toggle (settings icon in bottom of sidebar)
  const themeBtn = page.locator('button[title*="theme"], button[aria-label*="theme"], [data-testid="theme-toggle"]');
  if (await themeBtn.count() > 0) {
    await themeBtn.first().click();
    await page.waitForTimeout(500);
  }
  await page.screenshot({ path: 'screenshots/issue-29/dark-theme-pw.png' });
});
