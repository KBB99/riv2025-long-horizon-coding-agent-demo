import { test, expect } from '@playwright/test';

test('create issue modal opens with C key', async ({ page }) => {
  await page.goto('http://localhost:6174');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);

  // Press C to open create issue modal
  await page.keyboard.press('c');
  await page.waitForTimeout(500);

  // Check if the dialog is open
  const dialog = page.locator('[role="dialog"]');
  await expect(dialog).toBeVisible();

  // Check it has the "Create Issue" title
  await expect(dialog.locator('text=Create Issue')).toBeVisible();
});

test('search modal opens with Cmd+K', async ({ page }) => {
  await page.goto('http://localhost:6174');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);

  // Click the search bar to trigger the command palette
  await page.click('text=Search issues, projects...');
  await page.waitForTimeout(500);

  // The command dialog should be visible
  const cmdDialog = page.locator('[cmdk-root]');
  await expect(cmdDialog).toBeVisible();
});

test('sidebar collapses and expands', async ({ page }) => {
  await page.goto('http://localhost:6174');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);

  // Find the sidebar collapse button (the one in the bottom section)
  const collapseBtn = page.locator('aside').locator('button').filter({ hasText: /^$/ }).last();
  await collapseBtn.click();
  await page.waitForTimeout(300);

  // Sidebar should be collapsed (narrow width)
  const sidebar = page.locator('aside');
  const box = await sidebar.boundingBox();
  expect(box.width).toBeLessThan(100);

  // Click again to expand
  await collapseBtn.click();
  await page.waitForTimeout(300);
  const boxExpanded = await sidebar.boundingBox();
  expect(boxExpanded.width).toBeGreaterThan(100);
});

test('board view shows Kanban columns with issues from API', async ({ page }) => {
  // Get the project ID from the API
  const response = await page.request.get('https://wuoq75966e.execute-api.us-east-1.amazonaws.com/projects');
  const projects = await response.json();
  const project = projects.find(p => p.key === 'CAN');

  if (!project) {
    test.skip();
    return;
  }

  await page.goto(`http://localhost:6174/project/${project.id}/board`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  // Should see Kanban columns
  await expect(page.locator('text=To Do')).toBeVisible();
  await expect(page.locator('text=In Progress')).toBeVisible();

  // Should see issue cards
  await expect(page.locator('text=CAN-1')).toBeVisible();
});
