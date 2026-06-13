import { apiClient } from './client';
import type { Job, PaginatedJobsResponse, CreateJobPayload } from '../types/job.types';

export const jobsApi = {
  create: (payload: CreateJobPayload) =>
    apiClient.post<Job>('/jobs', payload).then(r => r.data),

  list: (params?: { limit?: number; cursor?: string }) =>
    apiClient
      .get<PaginatedJobsResponse>('/jobs', { params })
      .then(r => r.data),

  getById: (id: string) =>
    apiClient.get<Job>(`/jobs/${id}`).then(r => r.data),

  complete: (id: string, data: { outputFileName: string; executionDuration: number }) =>
    apiClient.post<Job>(`/jobs/${id}/complete`, data).then(r => r.data),

  fail: (id: string, data: { errorMessage: string }) =>
    apiClient.post<Job>(`/jobs/${id}/fail`, data).then(r => r.data),
};
