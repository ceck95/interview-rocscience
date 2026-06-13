import { test, expect } from '@playwright/test';

test.describe('Jobs List Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/jobs');
    await page.waitForLoadState('networkidle');
  });

  test('renders the jobs page with heading', async ({ page }) => {
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('has a Submit Job button/link', async ({ page }) => {
    await expect(
      page.getByRole('link', { name: /submit/i }).first()
    ).toBeVisible();
  });

  test('has navigation links', async ({ page }) => {
    await expect(page.getByRole('link', { name: /billing/i })).toBeVisible();
  });

  test('shows table headers', async ({ page }) => {
    await expect(page.getByText(/job name/i).first()).toBeVisible();
    await expect(page.getByText(/status/i).first()).toBeVisible();
  });

  test('shows jobs or empty state message', async ({ page }) => {
    const hasJobs = (await page.locator('table tbody tr').count()) > 0;
    const hasEmpty = await page
      .getByText(/no jobs/i)
      .isVisible()
      .catch(() => false);
    expect(hasJobs || hasEmpty).toBe(true);
  });

  test('clicking Submit Job navigates to submit page', async ({ page }) => {
    await page.getByRole('link', { name: /submit/i }).first().click();
    await expect(page).toHaveURL(/\/jobs\/submit/);
  });
});
