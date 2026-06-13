import { ComputeType } from '../enums';

export const JOB_ENTITY_TYPE = 'JOB' as const;
export const JOB_GSI_NAME = 'entityType-createdAt-index' as const;
export const SECONDS_PER_MINUTE = 60;
export const PRESIGNED_URL_EXPIRY_SECONDS = 3600;
export const DEFAULT_PAGE_LIMIT = 10;

export const CREDIT_RATES: Record<ComputeType, number> = {
  [ComputeType.CPU_SMALL]: 1,
  [ComputeType.CPU_LARGE]: 3,
  [ComputeType.GPU]: 8,
};

export function calculateCreditCost(
  executionDuration: number,
  computeType: ComputeType,
): number {
  return (
    Math.ceil(executionDuration / SECONDS_PER_MINUTE) *
    CREDIT_RATES[computeType]
  );
}
