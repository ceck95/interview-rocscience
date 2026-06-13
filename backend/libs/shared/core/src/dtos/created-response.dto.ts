import { ApiProperty } from '@nestjs/swagger';

export class CreatedResponseDto {
  @ApiProperty({ description: 'ID of the created resource' })
  id!: string;
}
