import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class CompleteJobDto {
  @ApiProperty({ example: 'output.txt' })
  @IsString()
  @IsNotEmpty()
  outputFileName!: string;

  @ApiProperty({ description: 'Execution duration in seconds', example: 45 })
  @IsNumber()
  @Min(0)
  executionDuration!: number;
}
