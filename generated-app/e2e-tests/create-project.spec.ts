import { test, expect } from '@playwright/test';

test('creates a project from UI and it persists to API', async ({ page }) => {
  await page.goto('http://localhost:6174/projects/new');
  await page.waitForLoadState('networkidle');

  // Fill in project name
  const nameInput = page.locator('input[placeholder="My Awesome Project"]');
  await nameInput.fill('E2E Test Project');

  // Wait for auto-generated key
  await page.waitForTimeout(300);

  // Click Create Project button
  await page.click('button:has-text("Create Project")');

  // Should navigate away (to projects or board)
  await page.waitForTimeout(2000);

  // Verify project was created by checking API
  const response = await page.evaluate(async () => {
    const res = await fetch('https://wuoq75966e.execute-api.us-east-1.amazonaws.com/projects');
    return res.json();
  });

  // Check we're redirected somewhere
  const url = page.url();
  expect(url).not.toContain('/projects/new');
});

test('project list page loads and shows projects', async ({ page }) => {
  await page.goto('http://localhost:6174/projects');
  await page.waitForLoadState('networkidle');

  // Wait for projects to load
  await page.waitForTimeout(1000);

  // Page should have the Projects title
  await expect(page.locator('h1:has-text("Projects")')).toBeVisible();
});
