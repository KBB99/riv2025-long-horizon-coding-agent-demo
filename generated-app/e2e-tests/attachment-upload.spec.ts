import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:6174';
const PROJECT_ID = 'c73dbae5-0111-46b6-99fa-5ba3ad60fbe2';
const ISSUE_ID = '3f1eb2fa-63a9-4a88-8b04-63e4e767a735';

test.describe('Issue Attachment Feature', () => {
  test('attachment section is visible on issue detail page', async ({ page }) => {
    await page.goto(`${BASE_URL}/project/${PROJECT_ID}/issues/${ISSUE_ID}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Verify attachment section exists
    const attachmentSection = page.locator('text=ATTACHMENTS');
    await expect(attachmentSection).toBeVisible();

    // Verify upload button exists
    const uploadButton = page.locator('text=Upload').first();
    await expect(uploadButton).toBeVisible();

    // Verify dropzone exists
    const dropzone = page.locator('[data-testid="attachment-dropzone"]');
    await expect(dropzone).toBeVisible();

    // Verify dropzone has correct text
    await expect(page.locator('text=Drag & drop files here or')).toBeVisible();
    await expect(page.locator('text=Max 5MB per file')).toBeVisible();
  });

  test('can upload a file via file input', async ({ page }) => {
    await page.goto(`${BASE_URL}/project/${PROJECT_ID}/issues/${ISSUE_ID}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Create a test file
    const fileInput = page.locator('[data-testid="attachment-file-input"]');

    // Upload a small text file
    await fileInput.setInputFiles({
      name: 'test-upload-doc.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('Hello, this is a test document for attachment upload.'),
    });

    // Wait for the upload to process (FileReader + mutation)
    await page.waitForTimeout(3000);

    // Verify the attachment appears - use the attachment list test id
    const attachmentList = page.locator('[data-testid="attachment-list"]');
    await expect(attachmentList).toBeVisible({ timeout: 10000 });

    // Check filename is visible in the attachment list (not the toast)
    const filenameInList = attachmentList.locator('text=test-upload-doc.txt');
    await expect(filenameInList).toBeVisible({ timeout: 5000 });
  });

  test('shows file size limit error for large files', async ({ page }) => {
    await page.goto(`${BASE_URL}/project/${PROJECT_ID}/issues/${ISSUE_ID}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Create a file larger than 5MB
    const largeBuffer = Buffer.alloc(6 * 1024 * 1024, 'x'); // 6MB

    const fileInput = page.locator('[data-testid="attachment-file-input"]');
    await fileInput.setInputFiles({
      name: 'large-file.txt',
      mimeType: 'text/plain',
      buffer: largeBuffer,
    });

    // Wait for error toast
    await page.waitForTimeout(1000);

    // Should show error toast about file size
    await expect(page.locator('text=too large')).toBeVisible({ timeout: 3000 });
  });

  test('can delete an uploaded attachment', async ({ page }) => {
    await page.goto(`${BASE_URL}/project/${PROJECT_ID}/issues/${ISSUE_ID}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // First upload a file
    const fileInput = page.locator('[data-testid="attachment-file-input"]');
    await fileInput.setInputFiles({
      name: 'to-delete.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('File to be deleted'),
    });

    await page.waitForTimeout(3000);

    // Verify the attachment list has the file
    const attachmentList = page.locator('[data-testid="attachment-list"]');
    await expect(attachmentList).toBeVisible({ timeout: 10000 });

    const attachmentItem = page.locator('[data-testid="attachment-item"]').filter({ hasText: 'to-delete' });
    await expect(attachmentItem).toBeVisible({ timeout: 5000 });

    // Hover over the attachment to reveal delete button
    await attachmentItem.hover();
    await page.waitForTimeout(500);

    // Click delete button (last button in the attachment item)
    const deleteButton = attachmentItem.locator('button').last();
    await deleteButton.click();

    // Wait for deletion
    await page.waitForTimeout(2000);

    // Verify it's gone from the list
    await expect(attachmentItem).not.toBeVisible({ timeout: 5000 });
  });
});
