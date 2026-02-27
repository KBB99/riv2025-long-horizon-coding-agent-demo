import { Page } from '@playwright/test';

const API_URL = 'https://q4rf5i4bal.execute-api.us-east-1.amazonaws.com';
const TEST_EMAIL = 'e2e-test-user@canopy.dev';
const TEST_PASSWORD = 'testpass123';
const TEST_NAME = 'E2E Test User';

/**
 * Ensures the page has a valid auth token for testing.
 * Call this before navigating to protected pages.
 */
export async function authenticatePage(page: Page, baseUrl: string = 'http://localhost:6174') {
  // Navigate to the base URL first to access localStorage
  await page.goto(baseUrl, { waitUntil: 'commit', timeout: 10000 }).catch(() => {});

  // Check if already authenticated
  const hasToken = await page.evaluate(() => !!localStorage.getItem('canopy_auth_token'));
  if (hasToken) return;

  // Try to login, then register if login fails
  const token = await page.evaluate(async ({ api, email, password, name }) => {
    try {
      // Try login
      let resp = await fetch(`${api}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (resp.ok) {
        const data = await resp.json();
        return data.token;
      }

      // Try register
      resp = await fetch(`${api}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      if (resp.ok) {
        const data = await resp.json();
        return data.token;
      }
    } catch {}
    return null;
  }, { api: API_URL, email: TEST_EMAIL, password: TEST_PASSWORD, name: TEST_NAME });

  if (token) {
    await page.evaluate((t) => localStorage.setItem('canopy_auth_token', t), token);
  }
}
