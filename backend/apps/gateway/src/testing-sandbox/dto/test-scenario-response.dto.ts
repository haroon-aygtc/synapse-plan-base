import { ApiProperty } from '@nestjs/swagger';

export class TestScenarioResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description?: string;

  @ApiProperty()
  sandboxId: string;

  @ApiProperty()
  testType: string;

  @ApiProperty()
  testData: any;

  @ApiProperty()
  expectedResults: any;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  organizationId: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
