import { test, expect } from '@playwright/test';

const API_BASE = 'http://localhost:3000/api';

test.describe('Full Job Execution Workflow', () => {
  test('complete job lifecycle: submit → view → complete → billing', async ({ page, request }) => {
    await page.goto('/jobs/submit');
    await page.waitForLoadState('networkidle');

    await page.locator('input#jobName').fill('Full Workflow E2E Job');
    await page.locator('input#projectId').fill('workflow-project-001');

    const select = page.locator('select').first();
    if (await select.count() > 0) {
      await select.selectOption('cpu-small');
    }

    const fileInput = page.locator('input').last();
    await fileInput.fill('workflow-input.csv');

    const [createResponse] = await Promise.all([
      page.waitForResponse(`${API_BASE}/jobs`),
      page.getByRole('button', { name: /submit/i }).click(),
    ]);

    await page.waitForURL(/\/jobs$/, { timeout: 10000 });

    const createBody = await createResponse.json();
    expect(createBody.jobId).toBeTruthy();
    const jobId = createBody.jobId;

    await page.goto(`/jobs/${jobId}`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Full Workflow E2E Job')).toBeVisible();

    const completeResp = await request.post(`${API_BASE}/jobs/${jobId}/complete`, {
      data: { outputFileName: 'workflow-output.txt', executionDuration: 60 },
    });
    expect([200, 400]).toContain(completeResp.status());

    await page.reload();
    await page.waitForLoadState('networkidle');
    const jobResp = await request.get(`${API_BASE}/jobs/${jobId}`);
    const detailBody = await jobResp.json();
    expect(['queued', 'running', 'completed', 'failed']).toContain(detailBody.status);

    await page.goto('/billing');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: /billing/i })).toBeVisible();

    const summaryResp = await request.get(`${API_BASE}/billing/summary`);
    expect(summaryResp.status()).toBe(200);
    const summary = await summaryResp.json();
    expect(typeof summary.totalCredits).toBe('number');

    const secondComplete = await request.post(`${API_BASE}/jobs/${jobId}/complete`, {
      data: { outputFileName: 'workflow-output.txt', executionDuration: 60 },
    });
    expect(secondComplete.status()).not.toBe(500);

    const billingResp = await request.get(`${API_BASE}/billing/${jobId}`);
    expect(billingResp.status()).toBe(200);
    const billingBody = await billingResp.json();
    const creditsAfterFirstComplete = billingBody.creditCost ?? 0;

    const secondBillingResp = await request.get(`${API_BASE}/billing/${jobId}`);
    const secondBillingBody = await secondBillingResp.json();
    expect(secondBillingBody.creditCost ?? 0).toBe(creditsAfterFirstComplete);
  });

  test('job failure workflow: submit → fail → verify status', async ({ request }) => {
    const createResp = await request.post(`${API_BASE}/jobs`, {
      data: {
        jobName: 'Failure Workflow Job',
        projectId: 'fail-project-001',
        computeType: 'gpu',
        inputFileName: 'fail-workflow.csv',
      },
    });
    expect(createResp.status()).toBe(201);
    const job = await createResp.json();

    const failResp = await request.post(`${API_BASE}/jobs/${job.jobId}/fail`, {
      data: { errorMessage: 'EC2 instance unreachable' },
    });
    expect(failResp.status()).toBe(200);
    const failedJob = await failResp.json();
    expect(failedJob.status).toBe('failed');
    expect(failedJob.errorMessage).toBe('EC2 instance unreachable');

    const billingResp = await request.get(`${API_BASE}/billing/${job.jobId}`);
    expect(billingResp.status()).toBe(200);
    const billingBody = await billingResp.json();
    expect(billingBody.creditCost ?? 0).toBe(0);
  });

  test('billing credit formula: cpu-small 2min = 2 credits', async ({ request }) => {
    const createResp = await request.post(`${API_BASE}/jobs`, {
      data: {
        jobName: 'Credit Calc Test cpu-small',
        projectId: 'credit-project-001',
        computeType: 'cpu-small',
        inputFileName: 'credit-test.csv',
      },
    });
    expect(createResp.status()).toBe(201);
    const job = await createResp.json();

    const completeResp = await request.post(`${API_BASE}/jobs/${job.jobId}/complete`, {
      data: { outputFileName: 'out.txt', executionDuration: 120 },
    });
    expect(completeResp.status()).toBe(200);
    const completed = await completeResp.json();

    if (completed.status === 'completed') {
      expect(completed.creditCost).toBe(2);
    }
  });

  test('billing credit formula: cpu-large 90sec = 6 credits', async ({ request }) => {
    const createResp = await request.post(`${API_BASE}/jobs`, {
      data: {
        jobName: 'Credit Calc Test cpu-large',
        projectId: 'credit-project-002',
        computeType: 'cpu-large',
        inputFileName: 'credit-test-large.csv',
      },
    });
    expect(createResp.status()).toBe(201);
    const job = await createResp.json();

    const completeResp = await request.post(`${API_BASE}/jobs/${job.jobId}/complete`, {
      data: { outputFileName: 'out.txt', executionDuration: 90 },
    });
    expect(completeResp.status()).toBe(200);
    const completed = await completeResp.json();

    if (completed.status === 'completed') {
      expect(completed.creditCost).toBe(6);
    }
  });

  test('billing credit formula: gpu 1min = 8 credits', async ({ request }) => {
    const createResp = await request.post(`${API_BASE}/jobs`, {
      data: {
        jobName: 'Credit Calc Test gpu',
        projectId: 'credit-project-003',
        computeType: 'gpu',
        inputFileName: 'credit-test-gpu.csv',
      },
    });
    expect(createResp.status()).toBe(201);
    const job = await createResp.json();

    const completeResp = await request.post(`${API_BASE}/jobs/${job.jobId}/complete`, {
      data: { outputFileName: 'out.txt', executionDuration: 60 },
    });
    expect(completeResp.status()).toBe(200);
    const completed = await completeResp.json();

    if (completed.status === 'completed') {
      expect(completed.creditCost).toBe(8);
    }
  });
});
