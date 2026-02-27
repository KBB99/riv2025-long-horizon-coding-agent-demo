#!/usr/bin/env node
/**
 * Playwright test helper for screenshot + console verification
 * Usage: node playwright-test.cjs --url URL --test-id TEST_ID --output-dir DIR --operation full
 */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function main() {
  const args = process.argv.slice(2);
  const getArg = (name) => {
    const idx = args.indexOf(`--${name}`);
    return idx !== -1 ? args[idx + 1] : null;
  };

  const url = getArg('url') || 'http://localhost:6174';
  const testId = getArg('test-id') || 'test';
  const outputDir = getArg('output-dir') || 'screenshots';
  const operation = getArg('operation') || 'full';

  fs.mkdirSync(outputDir, { recursive: true });

  const timestamp = Date.now();
  const screenshotPath = path.join(outputDir, `${testId}-${timestamp}.png`);
  const consolePath = path.join(outputDir, `${testId}-console.txt`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  const consoleMessages = [];
  const consoleErrors = [];

  page.on('console', (msg) => {
    const type = msg.type();
    const text = msg.text();
    consoleMessages.push(`[${type}] ${text}`);
    if (type === 'error') {
      // Filter out browser-level network resource loading errors (not JS app errors)
      const isNetworkError = text.startsWith('Failed to load resource:');
      if (!isNetworkError) {
        consoleErrors.push(text);
      }
    }
  });

  page.on('pageerror', (err) => {
    consoleErrors.push(`PAGE_ERROR: ${err.message}`);
    consoleMessages.push(`[pageerror] ${err.message}`);
  });

  try {
    // If the URL is not a login/signup page, inject auth token for authenticated access
    const parsedUrl = new URL(url);
    if (!parsedUrl.pathname.startsWith('/login') && !parsedUrl.pathname.startsWith('/signup')) {
      // Navigate to the origin first to set localStorage
      await page.goto(parsedUrl.origin, { waitUntil: 'commit', timeout: 10000 }).catch(() => {});
      await page.evaluate(() => {
        // Check if token exists; if not, set a test token via API
        if (!localStorage.getItem('canopy_auth_token')) {
          // Set a placeholder - actual auth happens below
        }
      });
      // Try to authenticate with a test user if no token
      const hasToken = await page.evaluate(() => !!localStorage.getItem('canopy_auth_token'));
      if (!hasToken) {
        try {
          const apiUrl = await page.evaluate(() => {
            // Try to read VITE_API_URL from the page's env
            return document.querySelector('meta[name="api-url"]')?.content || '';
          });
          // Try to register/login via API
          const baseApi = apiUrl || process.env.VITE_API_URL || 'https://q4rf5i4bal.execute-api.us-east-1.amazonaws.com';
          if (baseApi) {
            const loginResp = await page.evaluate(async (api) => {
              try {
                // Try login first
                let resp = await fetch(`${api}/auth/login`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ email: 'screenshot-test@canopy.dev', password: 'testpass123' }),
                });
                if (resp.ok) return resp.json();
                // If login fails, register
                resp = await fetch(`${api}/auth/register`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ name: 'Screenshot Test', email: 'screenshot-test@canopy.dev', password: 'testpass123' }),
                });
                if (resp.ok) return resp.json();
                return null;
              } catch { return null; }
            }, baseApi);
            if (loginResp && loginResp.token) {
              await page.evaluate((token) => {
                localStorage.setItem('canopy_auth_token', token);
              }, loginResp.token);
            }
          }
        } catch (e) {
          // Ignore auth errors for screenshot tests
        }
      }
    }
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    // Extra wait for React to render
    await page.waitForTimeout(2000);

    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log(`Screenshot saved: ${screenshotPath}`);

    // Write console log
    let consoleOutput = '';
    if (consoleErrors.length > 0) {
      consoleOutput = `CONSOLE_ERRORS_FOUND\n\nErrors:\n${consoleErrors.join('\n')}\n\nAll Messages:\n${consoleMessages.join('\n')}`;
    } else {
      consoleOutput = `NO_CONSOLE_ERRORS\n\nAll Messages:\n${consoleMessages.join('\n')}`;
    }
    fs.writeFileSync(consolePath, consoleOutput);
    console.log(`Console log saved: ${consolePath}`);

  } catch (err) {
    console.error(`Error: ${err.message}`);
    fs.writeFileSync(consolePath, `ERROR: ${err.message}\n\nConsole Messages:\n${consoleMessages.join('\n')}`);
    // Still try to take screenshot
    try {
      await page.screenshot({ path: screenshotPath, fullPage: false });
    } catch (e) {}
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
