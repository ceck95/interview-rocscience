import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class BillingSummaryResponseDto {
  @ApiProperty({ description: 'Total credits across all completed jobs' })
  @Expose()
  totalCredits!: number;

  @ApiProperty({ description: 'Total number of jobs' })
  @Expose()
  totalJobs!: number;

  @ApiProperty({ description: 'Number of completed jobs' })
  @Expose()
  completedJobs!: number;

  @ApiProperty({
    description: 'Credits breakdown by projectId',
    example: { 'project-alpha': 8, 'project-beta': 16 },
  })
  @Expose()
  byProject!: Record<string, number>;

  @ApiProperty({
    description: 'Credits breakdown by compute type',
    example: { 'cpu-small': 4, gpu: 24 },
  })
  @Expose()
  byComputeType!: Record<string, number>;
}
