export function makeJob(i: number) {
  return {
    jobId: `job-${String(i + 1).padStart(3, '0')}`,
    jobName: `test-job-${i + 1}`,
    projectId: `project-${(i % 3) + 1}`,
    computeType: ['cpu-small', 'cpu-large', 'gpu'][i % 3],
    inputFileName: `data-${i + 1}.csv`,
    inputFileKey: `jobs/job-${i + 1}/input/data-${i + 1}.csv`,
    status: 'queued',
    createdAt: new Date(Date.now() - i * 60_000).toISOString(),
    updatedAt: new Date(Date.now() - i * 60_000).toISOString(),
  };
}

export function makeJobs(count: number) {
  return Array.from({ length: count }, (_, i) => makeJob(i));
}

export function makePaginatedResponse(
  allJobs: ReturnType<typeof makeJob>[],
  page: number,
  pageSize = 10
) {
  const start = (page - 1) * pageSize;
  const items = allJobs.slice(start, start + pageSize);
  const hasMore = start + pageSize < allJobs.length;
  return {
    items,
    count: items.length,
    nextCursor: hasMore ? Buffer.from(JSON.stringify({ jobId: { S: items[items.length - 1].jobId } })).toString('base64') : undefined,
  };
}
