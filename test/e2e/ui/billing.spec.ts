import { test, expect } from '@playwright/test';

test.describe('Billing Summary Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/billing');
    await page.waitForLoadState('networkidle');
  });

  test('renders billing summary page', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /billing/i })).toBeVisible();
  });

  test('shows total credits summary card', async ({ page }) => {
    await expect(page.getByText(/credits/i).first()).toBeVisible();
  });

  test('shows compute type breakdown section', async ({ page }) => {
    const hasBreakdown =
      (await page.getByText(/cpu-small|cpu-large|gpu/i).count()) > 0 ||
      (await page.getByText(/compute/i).count()) > 0;
    expect(hasBreakdown).toBe(true);
  });

  test('billing page does not crash with no data', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.reload();
    await page.waitForLoadState('networkidle');
    expect(errors).toHaveLength(0);
  });
});
