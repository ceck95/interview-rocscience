import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class FailJobDto {
  @ApiPropertyOptional({ example: 'Out of memory' })
  @IsString()
  @IsOptional()
  errorMessage?: string;
}
