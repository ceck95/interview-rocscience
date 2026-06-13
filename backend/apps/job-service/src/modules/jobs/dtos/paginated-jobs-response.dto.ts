import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { JobResponseDto } from './job-response.dto';

export class PaginatedJobsResponseDto {
  @ApiProperty({ type: [JobResponseDto] })
  @Expose()
  @Type(() => JobResponseDto)
  items!: JobResponseDto[];

  @ApiPropertyOptional({
    description:
      'Cursor for the next page. Pass as `cursor` query param. Absent when no more pages.',
  })
  @Expose()
  nextCursor?: string;

  @ApiProperty({ description: 'Number of items returned in this page' })
  @Expose()
  count!: number;
}
