import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { JobStatus, ComputeType } from '../../enums';
import { JOB_ENTITY_TYPE, JOB_GSI_NAME } from '../../constants';

export interface JobItem {
  jobId: string;
  entityType: typeof JOB_ENTITY_TYPE;
  jobName: string;
  projectId: string;
  computeType: ComputeType;
  inputFileName: string;
  inputFileKey: string;
  status: JobStatus;
  outputFileName?: string;
  outputFileKey?: string;
  executionDuration?: number;
  creditCost?: number;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface CompleteJobData {
  outputFileName: string;
  outputFileKey: string;
  executionDuration: number;
  creditCost: number;
}

@Injectable()
export class DynamoDBService {
  private readonly logger = new Logger(DynamoDBService.name);
  private readonly client: DynamoDBDocumentClient;
  private readonly tableName: string;

  constructor(private readonly configService: ConfigService) {
    const awsCfg = this.configService.get('aws');
    const dynamoClient = new DynamoDBClient({
      region: awsCfg.region,
      ...(awsCfg.endpoint ? { endpoint: awsCfg.endpoint } : {}),
      ...(awsCfg.credentials ? { credentials: awsCfg.credentials } : {}),
    });
    this.client = DynamoDBDocumentClient.from(dynamoClient);
    this.tableName = awsCfg.dynamoTableName;
  }

  async putJob(job: JobItem): Promise<void> {
    this.logger.log(`putJob jobId=${job.jobId}`);
    await this.client.send(
      new PutCommand({
        TableName: this.tableName,
        Item: job,
      }),
    );
  }

  async getJob(jobId: string): Promise<JobItem | null> {
    this.logger.log(`getJob jobId=${jobId}`);
    const result = await this.client.send(
      new GetCommand({
        TableName: this.tableName,
        Key: { jobId },
      }),
    );
    return result.Item ? (result.Item as JobItem) : null;
  }

  async listJobs(
    limit: number,
    cursor?: string,
  ): Promise<{ items: JobItem[]; nextCursor?: string }> {
    this.logger.log(`listJobs limit=${limit} cursor=${cursor ?? 'none'}`);

    const exclusiveStartKey = cursor
      ? (JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8')) as Record<
          string,
          unknown
        >)
      : undefined;

    const result = await this.client.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: JOB_GSI_NAME,
        KeyConditionExpression: 'entityType = :type',
        ExpressionAttributeValues: { ':type': JOB_ENTITY_TYPE },
        ScanIndexForward: false,
        Limit: limit,
        ...(exclusiveStartKey ? { ExclusiveStartKey: exclusiveStartKey } : {}),
      }),
    );

    const items = (result.Items ?? []) as JobItem[];
    const nextCursor = result.LastEvaluatedKey
      ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
      : undefined;

    return { items, nextCursor };
  }

  async listAllJobs(): Promise<JobItem[]> {
    this.logger.log('listAllJobs');
    const items: JobItem[] = [];
    let lastKey: Record<string, unknown> | undefined;

    do {
      const result = await this.client.send(
        new ScanCommand({
          TableName: this.tableName,
          ...(lastKey ? { ExclusiveStartKey: lastKey } : {}),
        }),
      );
      items.push(...((result.Items ?? []) as JobItem[]));
      lastKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
    } while (lastKey);

    return items.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  async updateJob(jobId: string, updates: Partial<JobItem>): Promise<JobItem> {
    const now = new Date().toISOString();
    const fields: Partial<JobItem> = { ...updates, updatedAt: now };

    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, unknown> = {};
    const setParts: string[] = [];

    for (const [key, value] of Object.entries(fields) as Array<
      [string, unknown]
    >) {
      if (value !== undefined) {
        expressionAttributeNames[`#${key}`] = key;
        expressionAttributeValues[`:${key}`] = value;
        setParts.push(`#${key} = :${key}`);
      }
    }

    const result = await this.client.send(
      new UpdateCommand({
        TableName: this.tableName,
        Key: { jobId },
        UpdateExpression: `SET ${setParts.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW',
      }),
    );

    return result.Attributes as JobItem;
  }

  async failJobConditional(
    jobId: string,
    errorMessage?: string,
  ): Promise<JobItem> {
    const now = new Date().toISOString();

    try {
      const result = await this.client.send(
        new UpdateCommand({
          TableName: this.tableName,
          Key: { jobId },
          UpdateExpression:
            'SET #status = :failed, updatedAt = :now, errorMessage = :errorMessage',
          ConditionExpression:
            'attribute_exists(jobId) AND #status <> :completed',
          ExpressionAttributeNames: { '#status': 'status' },
          ExpressionAttributeValues: {
            ':failed': JobStatus.FAILED,
            ':completed': JobStatus.COMPLETED,
            ':now': now,
            ':errorMessage': errorMessage ?? null,
          },
          ReturnValues: 'ALL_NEW',
        }),
      );

      return result.Attributes as JobItem;
    } catch (error) {
      if (error instanceof ConditionalCheckFailedException) {
        this.logger.warn(
          `failJobConditional: job ${jobId} already completed — ignoring fail request`,
        );
        const existing = await this.getJob(jobId);
        return existing as JobItem;
      }
      throw error;
    }
  }

  async completeJobIdempotent(
    jobId: string,
    data: CompleteJobData,
  ): Promise<JobItem> {
    const now = new Date().toISOString();

    try {
      const result = await this.client.send(
        new UpdateCommand({
          TableName: this.tableName,
          Key: { jobId },
          UpdateExpression:
            'SET #status = :completed, updatedAt = :now, completedAt = :now, ' +
            'outputFileName = :outputFileName, outputFileKey = :outputFileKey, ' +
            'executionDuration = :executionDuration, creditCost = :creditCost',
          ConditionExpression: 'attribute_exists(jobId) AND #status = :running',
          ExpressionAttributeNames: { '#status': 'status' },
          ExpressionAttributeValues: {
            ':completed': JobStatus.COMPLETED,
            ':running': JobStatus.RUNNING,
            ':now': now,
            ':outputFileName': data.outputFileName,
            ':outputFileKey': data.outputFileKey,
            ':executionDuration': data.executionDuration,
            ':creditCost': data.creditCost,
          },
          ReturnValues: 'ALL_NEW',
        }),
      );

      return result.Attributes as JobItem;
    } catch (error) {
      if (error instanceof ConditionalCheckFailedException) {
        this.logger.warn(
          `completeJobIdempotent: job ${jobId} already completed — returning existing`,
        );
        const existing = await this.getJob(jobId);
        return existing as JobItem;
      }
      throw error;
    }
  }
}
