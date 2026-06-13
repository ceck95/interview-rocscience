import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { DynamoDBService } from '../../aws/dynamodb.service';
import { S3Service } from '../../aws/s3.service';
import { calculateCreditCost } from '../../../constants';
import { CompleteJobDto, JobResponseDto } from '../dtos';

export class CompleteJobCommand {
  constructor(
    public readonly jobId: string,
    public readonly dto: CompleteJobDto,
  ) {}
}

@CommandHandler(CompleteJobCommand)
export class CompleteJobHandler implements ICommandHandler<CompleteJobCommand> {
  private readonly logger = new Logger(CompleteJobHandler.name);

  constructor(
    private readonly dynamoDBService: DynamoDBService,
    private readonly s3Service: S3Service,
  ) {}

  async execute(command: CompleteJobCommand): Promise<JobResponseDto> {
    const { jobId, dto } = command;

    const existing = await this.dynamoDBService.getJob(jobId);
    if (!existing) {
      throw new NotFoundException(`Job ${jobId} not found`);
    }

    const creditCost = calculateCreditCost(
      dto.executionDuration,
      existing.computeType,
    );
    const outputFileKey = this.s3Service.getOutputFileKey(
      jobId,
      dto.outputFileName,
    );

    this.logger.log(`CompleteJob jobId=${jobId} creditCost=${creditCost}`);

    const job = await this.dynamoDBService.completeJobIdempotent(jobId, {
      outputFileName: dto.outputFileName,
      outputFileKey,
      executionDuration: dto.executionDuration,
      creditCost,
    });

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
