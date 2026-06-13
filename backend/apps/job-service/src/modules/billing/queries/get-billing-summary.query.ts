import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { DynamoDBService } from '../../aws/dynamodb.service';
import { JobStatus } from '../../../enums';
import { BillingSummaryResponseDto } from '../dtos';

export class GetBillingSummaryQuery {}

@QueryHandler(GetBillingSummaryQuery)
export class GetBillingSummaryHandler implements IQueryHandler<GetBillingSummaryQuery> {
  private readonly logger = new Logger(GetBillingSummaryHandler.name);

  constructor(private readonly dynamoDBService: DynamoDBService) {}

  async execute(): Promise<BillingSummaryResponseDto> {
    this.logger.log('GetBillingSummary');

    const allJobs = await this.dynamoDBService.listAllJobs();
    const completedJobs = allJobs.filter(
      (job) => job.status === JobStatus.COMPLETED,
    );

    const totalCredits = completedJobs.reduce(
      (sum, job) => sum + (job.creditCost ?? 0),
      0,
    );

    const byProject: Record<string, number> = {};
    const byComputeType: Record<string, number> = {};

    for (const job of completedJobs) {
      byProject[job.projectId] =
        (byProject[job.projectId] ?? 0) + (job.creditCost ?? 0);
      byComputeType[job.computeType] =
        (byComputeType[job.computeType] ?? 0) + (job.creditCost ?? 0);
    }

    return plainToInstance(
      BillingSummaryResponseDto,
      {
        totalCredits,
        totalJobs: allJobs.length,
        completedJobs: completedJobs.length,
        byProject,
        byComputeType,
      },
      { excludeExtraneousValues: true },
    );
  }
}
