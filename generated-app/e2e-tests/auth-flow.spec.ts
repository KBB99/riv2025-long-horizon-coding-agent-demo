import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:6174';
const uniqueEmail = `e2euser_${Date.now()}@canopy.dev`;
const testPassword = 'testpass123';
const testName = 'E2E Auth User';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Clear auth token before each test by navigating to login and clearing storage
    await page.goto(`${BASE_URL}/login`);
    await page.evaluate(() => {
      localStorage.removeItem('canopy_auth_token');
      localStorage.removeItem('canopy_app_state');
    });
  });

  test('redirects unauthenticated users to login page', async ({ page }) => {
    // Navigate to root - should redirect to login
    await page.goto(BASE_URL);
    // Wait for redirect
    await page.waitForTimeout(2000);
    // Should show login page content
    await expect(page.locator('text=Welcome back')).toBeVisible({ timeout: 10000 });
  });

  test('login page has link to signup', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');
    const signupLink = page.locator('a[href="/signup"]');
    await expect(signupLink).toBeVisible({ timeout: 5000 });
    await expect(signupLink).toContainText('Sign up');
  });

  test('signup page has all required fields', async ({ page }) => {
    await page.goto(`${BASE_URL}/signup`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible({ timeout: 5000 });
    await expect(page.locator('input[placeholder="John Doe"]')).toBeVisible();
    await expect(page.locator('input[placeholder="you@example.com"]')).toBeVisible();
    await expect(page.locator('input[placeholder="At least 6 characters"]')).toBeVisible();
    await expect(page.locator('input[placeholder="Confirm your password"]')).toBeVisible();
  });

  test('can register a new account and access the app', async ({ page }) => {
    await page.goto(`${BASE_URL}/signup`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible({ timeout: 5000 });

    // Fill in registration form
    await page.locator('input[placeholder="John Doe"]').fill(testName);
    await page.locator('input[placeholder="you@example.com"]').fill(uniqueEmail);
    await page.locator('input[placeholder="At least 6 characters"]').fill(testPassword);
    await page.locator('input[placeholder="Confirm your password"]').fill(testPassword);

    // Submit
    await page.locator('button[type="submit"]').click();

    // Should redirect to dashboard after registration (wait for navigation)
    await page.waitForTimeout(3000);

    // Should NOT be on login/signup page anymore
    const url = page.url();
    expect(url).not.toContain('/login');
    expect(url).not.toContain('/signup');
  });

  test('can login with existing account', async ({ page }) => {
    // First register a unique user for this test
    const loginEmail = `login_${Date.now()}@canopy.dev`;
    await page.goto(`${BASE_URL}/signup`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible({ timeout: 5000 });
    await page.locator('input[placeholder="John Doe"]').fill('Login Test');
    await page.locator('input[placeholder="you@example.com"]').fill(loginEmail);
    await page.locator('input[placeholder="At least 6 characters"]').fill(testPassword);
    await page.locator('input[placeholder="Confirm your password"]').fill(testPassword);
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(3000);

    // Now logout
    await page.evaluate(() => localStorage.removeItem('canopy_auth_token'));
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Welcome back')).toBeVisible({ timeout: 5000 });

    // Login with the account we created
    await page.locator('input[type="email"]').fill(loginEmail);
    await page.locator('input[type="password"]').fill(testPassword);
    await page.locator('button[type="submit"]').click();

    // Should redirect to app
    await page.waitForTimeout(3000);
    const url = page.url();
    expect(url).not.toContain('/login');
  });

  test('shows error for wrong password', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Welcome back')).toBeVisible({ timeout: 5000 });

    await page.locator('input[type="email"]').fill('nobody@canopy.dev');
    await page.locator('input[type="password"]').fill('wrongpassword');
    await page.locator('button[type="submit"]').click();

    // Should show error message
    await expect(page.locator('text=Invalid email or password')).toBeVisible({ timeout: 10000 });
  });
});
