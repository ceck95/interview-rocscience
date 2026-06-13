import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Logger, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { DynamoDBService } from '../../aws/dynamodb.service';
import { S3Service } from '../../aws/s3.service';
import { JobResponseDto } from '../dtos';

export class GetJobByIdQuery {
  constructor(public readonly jobId: string) {}
}

@QueryHandler(GetJobByIdQuery)
export class GetJobByIdHandler implements IQueryHandler<GetJobByIdQuery> {
  private readonly logger = new Logger(GetJobByIdHandler.name);

  constructor(
    private readonly dynamoDBService: DynamoDBService,
    private readonly s3Service: S3Service,
  ) {}

  async execute(query: GetJobByIdQuery): Promise<JobResponseDto> {
    const { jobId } = query;
    this.logger.log(`GetJobById jobId=${jobId}`);

    const job = await this.dynamoDBService.getJob(jobId);
    if (!job) {
      throw new NotFoundException(`Job ${jobId} not found`);
    }

    let outputDownloadUrl: string | undefined;
    if (job.outputFileKey) {
      outputDownloadUrl = await this.s3Service.getPresignedDownloadUrl(
        job.outputFileKey,
      );
    }

    return plainToInstance(
      JobResponseDto,
      { ...job, outputDownloadUrl },
      { excludeExtraneousValues: true },
    );
  }
}
