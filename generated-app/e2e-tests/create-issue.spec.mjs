import { test, expect } from '@playwright/test';

test('creates an issue from the create modal', async ({ page }) => {
  // First get a project ID
  const response = await page.request.get('https://wuoq75966e.execute-api.us-east-1.amazonaws.com/projects');
  const projects = await response.json();
  const project = projects.find(p => p.key === 'CAN');

  if (!project) {
    test.skip();
    return;
  }

  await page.goto(`http://localhost:6174/project/${project.id}/board`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);

  // Click the Create button in the top nav (header)
  const createBtn = page.locator('header button:has-text("Create")');
  await createBtn.click();
  await page.waitForTimeout(1000);

  // The dialog should be visible
  const dialog = page.locator('[role="dialog"]');
  await expect(dialog).toBeVisible({ timeout: 5000 });

  // Fill in the summary
  const summaryInput = dialog.locator('input[placeholder="What needs to be done?"]');
  const uniqueName = `E2E issue ${Date.now()}`;
  await summaryInput.fill(uniqueName);

  // Click the submit button inside the dialog
  const submitBtn = dialog.locator('button[type="submit"]');
  await submitBtn.click();
  await page.waitForTimeout(3000);

  // Reload to make sure data persists from API
  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // The issue should be visible on the board (in To Do column)
  const issue = page.locator(`text=${uniqueName}`);
  await expect(issue).toBeVisible({ timeout: 10000 });
});
