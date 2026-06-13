import { apiClient } from './client';
import type { BillingSummary, Job } from '../types/job.types';

export const billingApi = {
  getSummary: () =>
    apiClient.get<BillingSummary>('/billing/summary').then(r => r.data),

  getByJobId: (id: string) =>
    apiClient.get<Job>(`/billing/${id}`).then(r => r.data),
};
