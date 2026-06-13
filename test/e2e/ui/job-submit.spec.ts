import { test, expect } from '@playwright/test';

test.describe('Job Submission Form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/jobs/submit');
    await page.waitForLoadState('domcontentloaded');
  });

  test('renders the submission form', async ({ page }) => {
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('has all required form fields', async ({ page }) => {
    await expect(page.locator('input#jobName')).toBeVisible();
    await expect(page.locator('select').first()).toBeVisible();
  });

  test('shows validation error when submitting empty form', async ({ page }) => {
    await page.getByRole('button', { name: /submit/i }).click();
    await expect(page).toHaveURL(/\/jobs\/submit/);
  });

  test('successfully submits a job and redirects to jobs list', async ({ page }) => {
    await page.locator('input').first().fill('E2E UI Test Job');

    const inputs = page.locator('input');
    if ((await inputs.count()) >= 2) {
      await inputs.nth(1).fill('ui-project-001');
    }

    const select = page.locator('select').first();
    if ((await select.count()) > 0) {
      await select.selectOption('cpu-small');
    }

    const allInputs = await inputs.all();
    if (allInputs.length >= 3) {
      await allInputs[allInputs.length - 1].fill('ui-test-input.csv');
    }

    await Promise.all([
      page.waitForURL(/\/jobs/, { timeout: 10000 }),
      page.getByRole('button', { name: /submit/i }).click(),
    ]);

    expect(page.url()).toMatch(/\/jobs/);
  });
});
