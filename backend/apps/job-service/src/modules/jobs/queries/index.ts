import { GetJobByIdHandler } from './get-job-by-id.query';
import { GetListJobsHandler } from './get-list-jobs.query';

export * from './get-job-by-id.query';
export * from './get-list-jobs.query';

export const JobQueryHandlers = [GetJobByIdHandler, GetListJobsHandler];
