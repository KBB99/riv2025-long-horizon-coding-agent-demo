import { test, expect } from '@playwright/test';
import { authenticatePage } from './auth-helper';

const BASE_URL = 'http://localhost:6174';

test.describe('Logout Flow', () => {
  test('sign out button logs the user out', async ({ page }) => {
    // First authenticate
    await authenticatePage(page, BASE_URL);
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Verify we're on the dashboard (authenticated)
    const topNav = page.locator('header');
    await expect(topNav).toBeVisible({ timeout: 5000 });

    // Click the user avatar dropdown
    const avatarBtn = page.locator('header button').last();
    await avatarBtn.click();

    // Click Sign out
    const signOutItem = page.locator('text=Sign out');
    await expect(signOutItem).toBeVisible({ timeout: 3000 });
    await signOutItem.click();

    // Should redirect to login
    await page.waitForTimeout(2000);
    await expect(page.locator('text=Welcome back')).toBeVisible({ timeout: 10000 });
  });
});
