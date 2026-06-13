import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { DynamoDBService } from '../../aws/dynamodb.service';
import { FailJobDto, JobResponseDto } from '../dtos';

export class FailJobCommand {
  constructor(
    public readonly jobId: string,
    public readonly dto: FailJobDto,
  ) {}
}

@CommandHandler(FailJobCommand)
export class FailJobHandler implements ICommandHandler<FailJobCommand> {
  private readonly logger = new Logger(FailJobHandler.name);

  constructor(private readonly dynamoDBService: DynamoDBService) {}

  async execute(command: FailJobCommand): Promise<JobResponseDto> {
    const { jobId, dto } = command;

    const existing = await this.dynamoDBService.getJob(jobId);
    if (!existing) {
      throw new NotFoundException(`Job ${jobId} not found`);
    }

    this.logger.log(`FailJob jobId=${jobId}`);

    const job = await this.dynamoDBService.failJobConditional(
      jobId,
      dto.errorMessage,
    );

    return plainToInstance(JobResponseDto, job, {
      excludeExtraneousValues: true,
    });
  }
}
