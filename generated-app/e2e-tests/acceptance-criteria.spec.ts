import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:6174';

test.describe('Acceptance Criteria Feature', () => {
  test('CreateIssueModal shows acceptance criteria textarea', async ({ page }) => {
    await page.goto(BASE);
    await page.waitForLoadState('networkidle');

    // Click the Create button in the top nav
    await page.click('button:has-text("Create")');

    // Wait for the dialog to appear
    await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

    // Verify the acceptance criteria field exists
    const acLabel = page.locator('label:has-text("Acceptance Criteria")');
    await expect(acLabel).toBeVisible();

    const acTextarea = page.locator('[data-testid="acceptance-criteria-input"]');
    await expect(acTextarea).toBeVisible();

    // Type in acceptance criteria
    await acTextarea.fill('- [ ] First criterion\n- [ ] Second criterion');
    await expect(acTextarea).toHaveValue('- [ ] First criterion\n- [ ] Second criterion');

    await page.screenshot({ path: 'screenshots/issue-31/create-modal-ac-field.png' });
  });

  test('IssueDetail shows acceptance criteria section', async ({ page }) => {
    // Navigate to a known issue with acceptance criteria
    await page.goto(`${BASE}/issues/b2dd97fc-4629-43c0-ad31-3e7dc68f26ce`);
    await page.waitForLoadState('networkidle');

    // Wait for the issue to load
    await page.waitForSelector('[data-testid="acceptance-criteria-section"]', { timeout: 10000 });

    // Verify section heading exists
    const heading = page.locator('h3:has-text("Acceptance Criteria")');
    await expect(heading).toBeVisible();

    // Verify the display content shows the criteria
    const display = page.locator('[data-testid="acceptance-criteria-display"]');
    await expect(display).toBeVisible();

    await page.screenshot({ path: 'screenshots/issue-31/issue-detail-ac-section.png' });
  });

  test('IssueDetail acceptance criteria can be edited', async ({ page }) => {
    await page.goto(`${BASE}/issues/b2dd97fc-4629-43c0-ad31-3e7dc68f26ce`);
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('[data-testid="acceptance-criteria-section"]', { timeout: 10000 });

    // Click on the acceptance criteria display to enter edit mode
    await page.click('[data-testid="acceptance-criteria-display"]');

    // Verify textarea appears
    const textarea = page.locator('[data-testid="acceptance-criteria-textarea"]');
    await expect(textarea).toBeVisible();

    // Edit the content
    await textarea.fill('- [x] Updated first criterion\n- [ ] New criterion added');

    // Click Save
    await page.click('button:has-text("Save")');

    // Wait for save to complete
    await page.waitForTimeout(1000);

    // Verify the display updates
    const display = page.locator('[data-testid="acceptance-criteria-display"]');
    await expect(display).toBeVisible();
    await expect(display).toContainText('Updated first criterion');

    await page.screenshot({ path: 'screenshots/issue-31/issue-detail-ac-edited.png' });
  });
});
