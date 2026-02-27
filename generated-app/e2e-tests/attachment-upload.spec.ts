import { test, expect } from '@playwright/test';
import { authenticatePage } from './auth-helper';

const BASE_URL = 'http://localhost:6174';
const API_URL = 'https://q4rf5i4bal.execute-api.us-east-1.amazonaws.com';

// We dynamically create a project + issue in beforeAll to avoid hardcoded IDs
let projectId: string;
let issueId: string;

test.beforeAll(async ({ request }) => {
  // Create a test project
  const projResp = await request.post(`${API_URL}/projects`, {
    data: { name: 'E2E Attachment Test', key: 'EAT', description: 'E2E test project' },
  });
  const project = await projResp.json();
  projectId = project.id;

  // Create a test issue
  const issueResp = await request.post(`${API_URL}/projects/${projectId}/issues`, {
    data: {
      projectId,
      summary: 'E2E Attachment Issue',
      type: 'Task',
      priority: 'Medium',
    },
  });
  const issue = await issueResp.json();
  issueId = issue.id;
});

test.describe('Issue Attachment Feature - Backend Integration', () => {
  test.beforeEach(async ({ page }) => {
    await authenticatePage(page, BASE_URL);
  });

  test('attachment section is visible on issue detail page', async ({ page }) => {
    await page.goto(`${BASE_URL}/project/${projectId}/issues/${issueId}`);
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

  test('can upload a file via file input and it persists via API', async ({ page, request }) => {
    await page.goto(`${BASE_URL}/project/${projectId}/issues/${issueId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Intercept network requests to verify XHR calls are made
    const apiCalls: string[] = [];
    page.on('request', (req) => {
      if (req.url().includes('/attachments')) {
        apiCalls.push(`${req.method()} ${req.url()}`);
      }
    });

    // Upload a small text file via file input
    const fileInput = page.locator('[data-testid="attachment-file-input"]');
    await fileInput.setInputFiles({
      name: 'e2e-test-doc.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('Hello from E2E test! This verifies backend attachment upload.'),
    });

    // Wait for the upload to process
    await page.waitForTimeout(3000);

    // Verify the attachment appears in the UI
    const attachmentList = page.locator('[data-testid="attachment-list"]');
    await expect(attachmentList).toBeVisible({ timeout: 10000 });
    const filenameInList = attachmentList.locator('text=e2e-test-doc.txt');
    await expect(filenameInList).toBeVisible({ timeout: 5000 });

    // Verify XHR calls were made (POST to upload, GET to list)
    expect(apiCalls.some(c => c.startsWith('POST'))).toBeTruthy();

    // Verify the attachment exists in the backend directly via API
    const listResp = await request.get(`${API_URL}/issues/${issueId}/attachments`);
    const attachments = await listResp.json();
    expect(attachments.length).toBeGreaterThan(0);
    const uploaded = attachments.find((a: { fileName: string }) => a.fileName === 'e2e-test-doc.txt');
    expect(uploaded).toBeTruthy();
    expect(uploaded.mimeType).toBe('text/plain');
  });

  test('shows file size limit error for large files', async ({ page }) => {
    await page.goto(`${BASE_URL}/project/${projectId}/issues/${issueId}`);
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

  test('can delete an uploaded attachment via API', async ({ page, request }) => {
    // First upload a file directly via API so we have a known attachment
    const uploadResp = await request.post(`${API_URL}/issues/${issueId}/attachments`, {
      data: {
        issueId,
        fileName: 'to-delete-e2e.txt',
        fileSize: 20,
        mimeType: 'text/plain',
        fileData: btoa('File to be deleted'),
      },
    });
    expect(uploadResp.ok()).toBeTruthy();

    await page.goto(`${BASE_URL}/project/${projectId}/issues/${issueId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Verify the attachment list has the file
    const attachmentList = page.locator('[data-testid="attachment-list"]');
    await expect(attachmentList).toBeVisible({ timeout: 10000 });

    const attachmentItem = page.locator('[data-testid="attachment-item"]').filter({ hasText: 'to-delete-e2e' });
    await expect(attachmentItem).toBeVisible({ timeout: 5000 });

    // Intercept network requests to verify DELETE XHR call
    const deleteCalls: string[] = [];
    page.on('request', (req) => {
      if (req.url().includes('/attachments') && req.method() === 'DELETE') {
        deleteCalls.push(req.url());
      }
    });

    // Hover over the attachment to reveal delete button
    await attachmentItem.hover();
    await page.waitForTimeout(500);

    // Click delete button (last button in the attachment item)
    const deleteButton = attachmentItem.locator('button').last();
    await deleteButton.click();

    // Wait for deletion
    await page.waitForTimeout(2000);

    // Verify the DELETE XHR call was made
    expect(deleteCalls.length).toBeGreaterThan(0);

    // Verify it's gone from the list
    await expect(attachmentItem).not.toBeVisible({ timeout: 5000 });

    // Verify it's gone from backend too
    const listResp = await request.get(`${API_URL}/issues/${issueId}/attachments`);
    const attachments = await listResp.json();
    const deleted = attachments.find((a: { fileName: string }) => a.fileName === 'to-delete-e2e.txt');
    expect(deleted).toBeFalsy();
  });

  test('uploaded attachments persist across page reloads (backend storage)', async ({ page, request }) => {
    // Upload directly via API
    await request.post(`${API_URL}/issues/${issueId}/attachments`, {
      data: {
        issueId,
        fileName: 'persist-test.txt',
        fileSize: 30,
        mimeType: 'text/plain',
        fileData: btoa('Persistence test file'),
      },
    });

    // Load the page
    await page.goto(`${BASE_URL}/project/${projectId}/issues/${issueId}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Verify attachment is visible
    const attachmentList = page.locator('[data-testid="attachment-list"]');
    await expect(attachmentList).toBeVisible({ timeout: 10000 });
    await expect(attachmentList.locator('text=persist-test.txt')).toBeVisible({ timeout: 5000 });

    // Clear localStorage to prove we're not using it
    await page.evaluate(() => localStorage.clear());

    // Reload the page
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Verify attachment is STILL visible (fetched from backend, not localStorage)
    const attachmentListAfter = page.locator('[data-testid="attachment-list"]');
    await expect(attachmentListAfter).toBeVisible({ timeout: 10000 });
    await expect(attachmentListAfter.locator('text=persist-test.txt')).toBeVisible({ timeout: 5000 });
  });
});
