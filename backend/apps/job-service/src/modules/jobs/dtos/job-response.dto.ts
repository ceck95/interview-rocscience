import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { JobStatus, ComputeType } from '../../../enums';

export class JobResponseDto {
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

  @ApiProperty()
  @Expose()
  inputFileName!: string;

  @ApiProperty()
  @Expose()
  inputFileKey!: string;

  @ApiProperty({ enum: JobStatus })
  @Expose()
  status!: JobStatus;

  @ApiPropertyOptional()
  @Expose()
  outputFileName?: string;

  @ApiPropertyOptional()
  @Expose()
  outputFileKey?: string;

  @ApiPropertyOptional({ description: 'Presigned S3 download URL for output' })
  @Expose()
  outputDownloadUrl?: string;

  @ApiPropertyOptional({
    description: 'Presigned S3 upload URL for input file',
  })
  @Expose()
  uploadUrl?: string;

  @ApiPropertyOptional({ description: 'Execution duration in seconds' })
  @Expose()
  executionDuration?: number;

  @ApiPropertyOptional()
  @Expose()
  creditCost?: number;

  @ApiPropertyOptional()
  @Expose()
  errorMessage?: string;

  @ApiProperty()
  @Expose()
  createdAt!: string;

  @ApiProperty()
  @Expose()
  updatedAt!: string;

  @ApiPropertyOptional()
  @Expose()
  completedAt?: string;
}
