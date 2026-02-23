import { test, expect } from '@playwright/test';

test('screenshot dark theme', async ({ page }) => {
  await page.goto('http://localhost:6174');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  // Click the user menu to find dark mode toggle
  const userMenuTrigger = page.locator('header button').last();
  await userMenuTrigger.click();
  await page.waitForTimeout(300);

  // Click Dark Mode
  const darkModeItem = page.getByText(/Dark Mode/i);
  if (await darkModeItem.isVisible()) {
    await darkModeItem.click();
    await page.waitForTimeout(500);
  }

  // Take screenshot of dark mode
  await page.screenshot({ path: 'screenshots/issue-28/dark-theme-screenshot.png' });

  // Verify dark class
  const hasDarkClass = await page.evaluate(() => {
    return document.documentElement.classList.contains('dark');
  });
  expect(hasDarkClass).toBe(true);
});
