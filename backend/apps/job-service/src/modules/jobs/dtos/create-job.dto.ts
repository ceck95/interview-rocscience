import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { ComputeType } from '../../../enums';

export class CreateJobDto {
  @ApiProperty({ example: 'data-processing-job-01' })
  @IsString()
  @IsNotEmpty()
  jobName!: string;

  @ApiProperty({ example: 'project-alpha' })
  @IsString()
  @IsNotEmpty()
  projectId!: string;

  @ApiProperty({ enum: ComputeType, example: ComputeType.CPU_SMALL })
  @IsEnum(ComputeType)
  computeType!: ComputeType;

  @ApiProperty({ example: 'data.csv' })
  @IsString()
  @IsNotEmpty()
  inputFileName!: string;
}
