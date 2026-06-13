import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { ComputeType, JobStatus } from '../../../enums';

export class BillingByJobResponseDto {
  @ApiProperty()
  @Expose()
  jobId!: string;

  @ApiProperty()
  @Expose()
  jobName!: string;

  @ApiProperty()
  @Expose()
  projectId!: string;

  @ApiProperty({ enum: ComputeType })
  @Expose()
  computeType!: ComputeType;

  @ApiProperty({ enum: JobStatus })
  @Expose()
  status!: JobStatus;

  @ApiPropertyOptional({ description: 'Execution duration in seconds' })
  @Expose()
  executionDuration?: number;

  @ApiPropertyOptional({ description: 'Credit cost for this job' })
  @Expose()
  creditCost?: number;

  @ApiProperty()
  @Expose()
  createdAt!: string;

  @ApiPropertyOptional()
  @Expose()
  completedAt?: string;
}
