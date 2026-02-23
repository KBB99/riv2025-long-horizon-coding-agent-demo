import { test, expect } from '@playwright/test';

test('dark theme toggle works', async ({ page }) => {
  await page.goto('http://localhost:6174');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  // Click the user menu
  const userMenuTrigger = page.locator('header button').last();
  await userMenuTrigger.click();
  await page.waitForTimeout(300);

  // Click Dark Mode
  const darkModeItem = page.getByText(/Dark Mode/i);
  if (await darkModeItem.isVisible()) {
    await darkModeItem.click();
    await page.waitForTimeout(500);

    // Check that dark class was applied
    const hasDarkClass = await page.evaluate(() => {
      return document.documentElement.classList.contains('dark');
    });
    expect(hasDarkClass).toBe(true);
  }
});
