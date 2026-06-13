import { CreateJobHandler } from './create-job.command';
import { CompleteJobHandler } from './complete-job.command';
import { FailJobHandler } from './fail-job.command';

export * from './create-job.command';
export * from './complete-job.command';
export * from './fail-job.command';

export const JobCommandHandlers = [
  CreateJobHandler,
  CompleteJobHandler,
  FailJobHandler,
];
