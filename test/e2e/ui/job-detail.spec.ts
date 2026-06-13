import { test, expect, request as playwrightRequest } from '@playwright/test';

test.describe('Job Detail Page', () => {
  let jobId: string;

  test.beforeAll(async () => {
    const apiContext = await playwrightRequest.newContext();
    const resp = await apiContext.post('http://localhost:3000/api/jobs', {
      data: {
        jobName: 'Detail View Test Job',
        projectId: 'detail-project-001',
        computeType: 'gpu',
        inputFileName: 'detail-test.csv',
      },
    });
    expect(resp.status()).toBe(201);
    const job = await resp.json();
    jobId = job.jobId;
    await apiContext.dispose();
  });

  test('renders job detail page with job information', async ({ page }) => {
    await page.goto(`/jobs/${jobId}`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Detail View Test Job')).toBeVisible();
  });

  test('shows job status', async ({ page }) => {
    await page.goto(`/jobs/${jobId}`);
    await page.waitForLoadState('networkidle');
    await expect(
      page.getByText(/queued|running|completed|failed/i).first()
    ).toBeVisible();
  });

  test('shows compute type', async ({ page }) => {
    await page.goto(`/jobs/${jobId}`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/gpu/i).first()).toBeVisible();
  });

  test('shows input file reference', async ({ page }) => {
    await page.goto(`/jobs/${jobId}`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/detail-test\.csv/i).first()).toBeVisible();
  });

  test('has back to jobs link', async ({ page }) => {
    await page.goto(`/jobs/${jobId}`);
    await page.waitForLoadState('networkidle');
    await expect(
      page.getByRole('link', { name: /back|jobs/i }).first()
    ).toBeVisible();
  });

  test('navigating to non-existent job shows error or redirect', async ({ page }) => {
    await page.goto('/jobs/non-existent-job-id-xyz');
    await page.waitForLoadState('networkidle');
    await expect(
      page.getByText(/failed to load job|not found|error/i).first()
    ).toBeVisible({ timeout: 10000 });
  });
});
