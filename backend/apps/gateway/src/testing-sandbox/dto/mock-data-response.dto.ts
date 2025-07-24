import { ApiProperty } from '@nestjs/swagger';

export class MockDataResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description?: string;

  @ApiProperty()
  sandboxId: string;

  @ApiProperty()
  dataType: string;

  @ApiProperty()
  schema: any;

  @ApiProperty()
  sampleData: any;

  @ApiProperty()
  generationRules: any;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  organizationId: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
