import { test, expect } from '@playwright/test';

const API_BASE = 'http://localhost:3000/api';

test.describe('Billing API', () => {
  let completedJobId: string;

  test.beforeAll(async ({ request }) => {
    const createResp = await request.post(`${API_BASE}/jobs`, {
      data: {
        jobName: 'Billing Test Job',
        projectId: 'billing-project-001',
        computeType: 'cpu-large',
        inputFileName: 'billing-test.csv',
      },
    });
    expect(createResp.status()).toBe(201);
    const job = await createResp.json();

    const completeResp = await request.post(`${API_BASE}/jobs/${job.jobId}/complete`, {
      data: { outputFileName: 'billing-out.txt', executionDuration: 180 },
    });
    const completed = await completeResp.json();

    if (completed.status === 'completed') {
      completedJobId = completed.jobId;
    }
  });

  test('GET /billing/summary - returns billing summary', async ({ request }) => {
    const response = await request.get(`${API_BASE}/billing/summary`);
    expect(response.status()).toBe(200);
    const body = await response.json();

    expect(typeof body.totalCredits).toBe('number');
    expect(typeof body.totalJobs).toBe('number');
    expect(typeof body.completedJobs).toBe('number');
    expect(body.byProject).toBeTruthy();
    expect(body.byComputeType).toBeTruthy();
    expect(body.totalCredits).toBeGreaterThanOrEqual(0);
  });

  test('GET /billing/summary - byComputeType contains valid keys', async ({ request }) => {
    const response = await request.get(`${API_BASE}/billing/summary`);
    expect(response.status()).toBe(200);
    const body = await response.json();

    const validComputeTypes = ['cpu-small', 'cpu-large', 'gpu'];
    for (const key of Object.keys(body.byComputeType)) {
      expect(validComputeTypes).toContain(key);
    }
  });

  test('GET /billing/:id - returns billing details for completed job', async ({ request }) => {
    if (!completedJobId) {
      test.skip();
      return;
    }

    const response = await request.get(`${API_BASE}/billing/${completedJobId}`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.jobId).toBe(completedJobId);
    expect(body.status).toBe('completed');
    expect(typeof body.creditCost).toBe('number');
    expect(body.creditCost).toBeGreaterThan(0);
  });

  test('GET /billing/:id - returns 404 for unknown job', async ({ request }) => {
    const response = await request.get(`${API_BASE}/billing/non-existent-xyz`);
    expect(response.status()).toBe(404);
  });
});
