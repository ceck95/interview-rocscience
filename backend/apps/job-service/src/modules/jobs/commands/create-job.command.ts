import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { v4 as uuidv4 } from 'uuid';
import { DynamoDBService } from '../../aws/dynamodb.service';
import { S3Service } from '../../aws/s3.service';
import { EC2Service } from '../../aws/ec2.service';
import { JobStatus } from '../../../enums';
import { JOB_ENTITY_TYPE } from '../../../constants';
import { CreateJobDto, JobResponseDto } from '../dtos';

export class CreateJobCommand {
  constructor(public readonly dto: CreateJobDto) {}
}

@CommandHandler(CreateJobCommand)
export class CreateJobHandler implements ICommandHandler<CreateJobCommand> {
  private readonly logger = new Logger(CreateJobHandler.name);

  constructor(
    private readonly dynamoDBService: DynamoDBService,
    private readonly s3Service: S3Service,
    private readonly ec2Service: EC2Service,
  ) {}

  async execute(command: CreateJobCommand): Promise<JobResponseDto> {
    const { dto } = command;
    const jobId = uuidv4();
    const now = new Date().toISOString();
    const inputFileKey = this.s3Service.getInputFileKey(
      jobId,
      dto.inputFileName,
    );

    this.logger.log(`CreateJob jobId=${jobId} computeType=${dto.computeType}`);

    const uploadUrl = await this.s3Service.getPresignedUploadUrl(inputFileKey);

    const job = {
      jobId,
      entityType: JOB_ENTITY_TYPE,
      jobName: dto.jobName,
      projectId: dto.projectId,
      computeType: dto.computeType,
      inputFileName: dto.inputFileName,
      inputFileKey,
      status: JobStatus.QUEUED,
      createdAt: now,
      updatedAt: now,
    };

    await this.dynamoDBService.putJob(job);

    void this.ec2Service
      .triggerJob(jobId, dto.computeType, inputFileKey)
      .then(() =>
        this.dynamoDBService.updateJob(jobId, { status: JobStatus.RUNNING }),
      )
      .catch((err: Error) => {
        this.logger.error(`Failed to trigger EC2 job ${jobId}: ${err.message}`);
        return this.dynamoDBService.updateJob(jobId, {
          status: JobStatus.FAILED,
          errorMessage: err.message,
        });
      });

    return plainToInstance(
      JobResponseDto,
      { ...job, uploadUrl },
      { excludeExtraneousValues: true },
    );
  }
}
