import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { DynamoDBService } from '../../aws/dynamodb.service';
import { JobResponseDto, PaginatedJobsResponseDto } from '../dtos';

export class GetListJobsQuery {
  constructor(
    public readonly limit: number,
    public readonly cursor?: string,
  ) {}
}

@QueryHandler(GetListJobsQuery)
export class GetListJobsHandler implements IQueryHandler<GetListJobsQuery> {
  private readonly logger = new Logger(GetListJobsHandler.name);

  constructor(private readonly dynamoDBService: DynamoDBService) {}

  async execute(query: GetListJobsQuery): Promise<PaginatedJobsResponseDto> {
    this.logger.log(`GetListJobs limit=${query.limit}`);
    const { items, nextCursor } = await this.dynamoDBService.listJobs(
      query.limit,
      query.cursor,
    );

    return plainToInstance(
      PaginatedJobsResponseDto,
      {
        items: plainToInstance(JobResponseDto, items, {
          excludeExtraneousValues: true,
        }),
        nextCursor,
        count: items.length,
      },
      { excludeExtraneousValues: true },
    );
  }
}
