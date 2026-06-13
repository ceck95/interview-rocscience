import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  CreateJobDto,
  CompleteJobDto,
  FailJobDto,
  JobResponseDto,
  PaginatedJobsResponseDto,
} from './dtos';
import { CreateJobCommand } from './commands/create-job.command';
import { CompleteJobCommand } from './commands/complete-job.command';
import { FailJobCommand } from './commands/fail-job.command';
import { GetJobByIdQuery } from './queries/get-job-by-id.query';
import { GetListJobsQuery } from './queries/get-list-jobs.query';
import { DEFAULT_PAGE_LIMIT } from '../../constants';

@ApiTags('Jobs')
@Controller('jobs')
export class JobsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new job and trigger EC2 execution' })
  @ApiResponse({ status: HttpStatus.CREATED, type: JobResponseDto })
  create(@Body() dto: CreateJobDto): Promise<JobResponseDto> {
    return this.commandBus.execute(new CreateJobCommand(dto));
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List jobs with cursor-based pagination' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Page size (default: 10)',
  })
  @ApiQuery({
    name: 'cursor',
    required: false,
    type: String,
    description: 'Cursor from previous response nextCursor field',
  })
  @ApiResponse({ status: HttpStatus.OK, type: PaginatedJobsResponseDto })
  findAll(
    @Query('limit', new DefaultValuePipe(DEFAULT_PAGE_LIMIT), ParseIntPipe)
    limit: number,
    @Query('cursor') cursor?: string,
  ): Promise<PaginatedJobsResponseDto> {
    return this.queryBus.execute(new GetListJobsQuery(limit, cursor));
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get job by ID' })
  @ApiParam({ name: 'id', description: 'Job ID' })
  @ApiResponse({ status: HttpStatus.OK, type: JobResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Job not found' })
  findOne(@Param('id') id: string): Promise<JobResponseDto> {
    return this.queryBus.execute(new GetJobByIdQuery(id));
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark job as completed (idempotent)' })
  @ApiParam({ name: 'id', description: 'Job ID' })
  @ApiResponse({ status: HttpStatus.OK, type: JobResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Job not found' })
  complete(
    @Param('id') id: string,
    @Body() dto: CompleteJobDto,
  ): Promise<JobResponseDto> {
    return this.commandBus.execute(new CompleteJobCommand(id, dto));
  }

  @Post(':id/fail')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark job as failed' })
  @ApiParam({ name: 'id', description: 'Job ID' })
  @ApiResponse({ status: HttpStatus.OK, type: JobResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Job not found' })
  fail(
    @Param('id') id: string,
    @Body() dto: FailJobDto,
  ): Promise<JobResponseDto> {
    return this.commandBus.execute(new FailJobCommand(id, dto));
  }
}
