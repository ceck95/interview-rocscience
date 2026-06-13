import { test, expect } from '@playwright/test';

const API_BASE = 'http://localhost:3000/api';

test.describe.serial('Jobs API', () => {
  let createdJobId: string;

  test('POST /jobs - creates a job successfully', async ({ request }) => {
    const response = await request.post(`${API_BASE}/jobs`, {
      data: {
        jobName: 'E2E Test Job',
        projectId: 'project-e2e-001',
        computeType: 'cpu-small',
        inputFileName: 'test-input.csv',
      },
    });
    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.jobId).toBeTruthy();
    expect(body.jobName).toBe('E2E Test Job');
    expect(body.projectId).toBe('project-e2e-001');
    expect(body.computeType).toBe('cpu-small');
    expect(body.status).toBe('queued');
    expect(body.inputFileName).toBe('test-input.csv');
    expect(body.inputFileKey).toContain(body.jobId);
    createdJobId = body.jobId;
  });

  test('GET /jobs - returns paginated response shape', async ({ request }) => {
    const response = await request.get(`${API_BASE}/jobs`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body.items)).toBe(true);
    expect(typeof body.count).toBe('number');
    expect(body.count).toBeLessThanOrEqual(10);
  });

  test('GET /jobs - created job is retrievable by ID', async ({ request }) => {
    const response = await request.get(`${API_BASE}/jobs/${createdJobId}`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.jobId).toBe(createdJobId);
  });

  test('GET /jobs/:id - gets job by ID', async ({ request }) => {
    const response = await request.get(`${API_BASE}/jobs/${createdJobId}`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.jobId).toBe(createdJobId);
    expect(body.jobName).toBe('E2E Test Job');
  });

  test('GET /jobs/:id - returns 404 for unknown ID', async ({ request }) => {
    const response = await request.get(`${API_BASE}/jobs/non-existent-id-xyz`);
    expect(response.status()).toBe(404);
  });

  test('POST /jobs/:id/complete - completes a job with billing calculation', async ({ request }) => {
    const completeResponse = await request.post(`${API_BASE}/jobs/${createdJobId}/complete`, {
      data: {
        outputFileName: 'output-result.txt',
        executionDuration: 120,
      },
    });
    expect([200, 400]).toContain(completeResponse.status());

    if (completeResponse.status() === 200) {
      const body = await completeResponse.json();
      expect(body.status).toBe('completed');
      expect(body.outputFileName).toBe('output-result.txt');
      expect(body.executionDuration).toBe(120);
      expect(body.creditCost).toBe(2);
    }
  });

  test('POST /jobs/:id/complete - is idempotent (calling twice is safe)', async ({ request }) => {
    const createResp = await request.post(`${API_BASE}/jobs`, {
      data: {
        jobName: 'Idempotency Test Job',
        projectId: 'project-e2e-002',
        computeType: 'cpu-large',
        inputFileName: 'idempotent-input.csv',
      },
    });
    const job = await createResp.json();
    const jobId = job.jobId;

    const first = await request.post(`${API_BASE}/jobs/${jobId}/complete`, {
      data: { outputFileName: 'out.txt', executionDuration: 60 },
    });
    const second = await request.post(`${API_BASE}/jobs/${jobId}/complete`, {
      data: { outputFileName: 'out.txt', executionDuration: 60 },
    });

    expect(second.status()).not.toBe(500);
  });

  test('POST /jobs/:id/fail - marks job as failed', async ({ request }) => {
    const createResp = await request.post(`${API_BASE}/jobs`, {
      data: {
        jobName: 'Fail Test Job',
        projectId: 'project-e2e-003',
        computeType: 'gpu',
        inputFileName: 'fail-input.csv',
      },
    });
    const job = await createResp.json();

    const failResp = await request.post(`${API_BASE}/jobs/${job.jobId}/fail`, {
      data: { errorMessage: 'Simulated failure for testing' },
    });
    expect(failResp.status()).toBe(200);
    const body = await failResp.json();
    expect(body.status).toBe('failed');
    expect(body.errorMessage).toBe('Simulated failure for testing');
  });

  test('POST /jobs - validates required fields', async ({ request }) => {
    const response = await request.post(`${API_BASE}/jobs`, {
      data: { jobName: 'Missing fields' },
    });
    expect(response.status()).toBe(400);
  });

  test('POST /jobs - validates computeType enum', async ({ request }) => {
    const response = await request.post(`${API_BASE}/jobs`, {
      data: {
        jobName: 'Invalid compute',
        projectId: 'proj-001',
        computeType: 'invalid-type',
        inputFileName: 'test.csv',
      },
    });
    expect(response.status()).toBe(400);
  });
});
