import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Logger, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { DynamoDBService } from '../../aws/dynamodb.service';
import { BillingByJobResponseDto } from '../dtos';

export class GetBillingByJobIdQuery {
  constructor(public readonly jobId: string) {}
}

@QueryHandler(GetBillingByJobIdQuery)
export class GetBillingByJobIdHandler implements IQueryHandler<GetBillingByJobIdQuery> {
  private readonly logger = new Logger(GetBillingByJobIdHandler.name);

  constructor(private readonly dynamoDBService: DynamoDBService) {}

  async execute(
    query: GetBillingByJobIdQuery,
  ): Promise<BillingByJobResponseDto> {
    const { jobId } = query;
    this.logger.log(`GetBillingByJobId jobId=${jobId}`);

    const job = await this.dynamoDBService.getJob(jobId);
    if (!job) {
      throw new NotFoundException(`Job ${jobId} not found`);
    }

    return plainToInstance(BillingByJobResponseDto, job, {
      excludeExtraneousValues: true,
    });
  }
}
