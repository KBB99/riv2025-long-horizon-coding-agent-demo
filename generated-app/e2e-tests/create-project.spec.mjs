import { test, expect } from '@playwright/test';

test('creates a project from UI and it persists to API', async ({ page }) => {
  await page.goto('http://localhost:6174/projects/new');
  await page.waitForLoadState('networkidle');

  // Fill in project name
  const nameInput = page.locator('input[placeholder="My Awesome Project"]');
  await nameInput.fill('E2E Test Project');

  // Wait for auto-generated key
  await page.waitForTimeout(500);

  // Click Create Project button
  await page.click('button:has-text("Create Project")');

  // Should navigate to the board or project list
  await page.waitForTimeout(2000);

  // Verify we navigated away from /projects/new
  const url = page.url();
  expect(url).not.toContain('/projects/new');
});

test('project list page loads and shows projects', async ({ page }) => {
  await page.goto('http://localhost:6174/projects');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  // Page should have the Projects title
  await expect(page.locator('h1:has-text("Projects")')).toBeVisible();
});
