import { test, expect } from '@playwright/test';
import { makeJobs, makePaginatedResponse } from './helpers/fixtures';

const API_URL = 'http://localhost:3000/api';

test.describe('Job list pagination', () => {
  test('does not show pagination controls when only one page', async ({ page }) => {
    const jobs = makeJobs(8);
    await page.route(`${API_URL}/jobs**`, (route) =>
      route.fulfill({ json: makePaginatedResponse(jobs, 1) })
    );

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('row')).toHaveCount(9); // 8 data rows + 1 header
    await expect(page.getByRole('button', { name: /next/i })).not.toBeVisible();
    await expect(page.getByRole('button', { name: /prev/i })).not.toBeVisible();
  });

  test('shows pagination controls when nextCursor is present', async ({ page }) => {
    const jobs = makeJobs(15);
    await page.route(`${API_URL}/jobs**`, (route) =>
      route.fulfill({ json: makePaginatedResponse(jobs, 1) })
    );

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Page 1')).toBeVisible();
    await expect(page.getByText('10 jobs on this page')).toBeVisible();
    await expect(page.getByRole('row')).toHaveCount(11); // 10 data rows + 1 header
  });

  test('Prev button is disabled on first page', async ({ page }) => {
    const jobs = makeJobs(15);
    await page.route(`${API_URL}/jobs**`, (route) =>
      route.fulfill({ json: makePaginatedResponse(jobs, 1) })
    );

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('button', { name: /prev/i })).toBeDisabled();
    await expect(page.getByRole('button', { name: /next/i })).toBeEnabled();
  });

  test('clicking Next fetches page 2 with cursor and shows remaining jobs', async ({ page }) => {
    const jobs = makeJobs(15);
    let callCount = 0;

    await page.route(`${API_URL}/jobs**`, (route) => {
      const url = new URL(route.request().url());
      const cursor = url.searchParams.get('cursor');
      callCount++;
      const pageNum = cursor ? 2 : 1;
      route.fulfill({ json: makePaginatedResponse(jobs, pageNum) });
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /next/i }).click();
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Page 2')).toBeVisible();
    await expect(page.getByRole('row')).toHaveCount(6); // 5 remaining rows + 1 header
    await expect(page.getByRole('button', { name: /next/i })).toBeDisabled();
    await expect(page.getByRole('button', { name: /prev/i })).toBeEnabled();
  });

  test('clicking Prev returns to page 1', async ({ page }) => {
    const jobs = makeJobs(15);

    await page.route(`${API_URL}/jobs**`, (route) => {
      const url = new URL(route.request().url());
      const cursor = url.searchParams.get('cursor');
      route.fulfill({ json: makePaginatedResponse(jobs, cursor ? 2 : 1) });
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /next/i }).click();
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Page 2')).toBeVisible();

    await page.getByRole('button', { name: /prev/i }).click();
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Page 1')).toBeVisible();
    await expect(page.getByRole('row')).toHaveCount(11);
    await expect(page.getByRole('button', { name: /prev/i })).toBeDisabled();
  });

  test('shows correct job names on each page', async ({ page }) => {
    const jobs = makeJobs(15);

    await page.route(`${API_URL}/jobs**`, (route) => {
      const url = new URL(route.request().url());
      const cursor = url.searchParams.get('cursor');
      route.fulfill({ json: makePaginatedResponse(jobs, cursor ? 2 : 1) });
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('test-job-1')).toBeVisible();
    await expect(page.getByText('test-job-10')).toBeVisible();
    await expect(page.getByText('test-job-11')).not.toBeVisible();

    await page.getByRole('button', { name: /next/i }).click();
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('test-job-11')).toBeVisible();
    await expect(page.getByText('test-job-15')).toBeVisible();
    await expect(page.getByText('test-job-1')).not.toBeVisible();
  });

  test('exactly 10 jobs shows no pagination controls', async ({ page }) => {
    const jobs = makeJobs(10);
    await page.route(`${API_URL}/jobs**`, (route) =>
      route.fulfill({ json: makePaginatedResponse(jobs, 1) })
    );

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('row')).toHaveCount(11);
    await expect(page.getByRole('button', { name: /next/i })).not.toBeVisible();
  });

  test('exactly 11 jobs triggers pagination with 1 job on page 2', async ({ page }) => {
    const jobs = makeJobs(11);

    await page.route(`${API_URL}/jobs**`, (route) => {
      const url = new URL(route.request().url());
      const cursor = url.searchParams.get('cursor');
      route.fulfill({ json: makePaginatedResponse(jobs, cursor ? 2 : 1) });
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Page 1')).toBeVisible();

    await page.getByRole('button', { name: /next/i }).click();
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('row')).toHaveCount(2); // 1 remaining row + header
    await expect(page.getByRole('button', { name: /next/i })).toBeDisabled();
  });
});
