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
  await page.waitForTimeout(500);

  // Press C to open create issue modal
  await page.keyboard.press('c');
  await page.waitForTimeout(500);

  // Fill in the summary
  const summaryInput = page.locator('input[placeholder="What needs to be done?"]');
  await summaryInput.fill('E2E created issue');

  // Click the Create button in the dialog (submit button)
  const dialogSubmit = page.locator('[role="dialog"] button[type="submit"]');
  await dialogSubmit.click();
  await page.waitForTimeout(2000);

  // Verify issue appears on the board after data refetch
  await page.reload();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  const issueText = page.locator('text=E2E created issue');
  await expect(issueText).toBeVisible();
});
