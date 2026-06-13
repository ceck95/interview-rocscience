export type JobStatus = 'queued' | 'running' | 'completed' | 'failed';
export type ComputeType = 'cpu-small' | 'cpu-large' | 'gpu';

export interface Job {
  jobId: string;
  jobName: string;
  projectId: string;
  computeType: ComputeType;
  inputFileName: string;
  inputFileKey: string;
  status: JobStatus;
  outputFileName?: string;
  outputFileKey?: string;
  executionDuration?: number;
  creditCost?: number;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface PaginatedJobsResponse {
  items: Job[];
  nextCursor?: string;
  count: number;
}

export interface CreateJobPayload {
  jobName: string;
  projectId: string;
  computeType: ComputeType;
  inputFileName: string;
}

export interface BillingSummary {
  totalCredits: number;
  totalJobs: number;
  completedJobs: number;
  byProject: Record<string, number>;
  byComputeType: Record<ComputeType, number>;
  jobs: Job[];
}
