import { ApiProperty } from '@nestjs/swagger';
import { ExecutionStatus } from '@shared/enums';

export class IntegrationTestResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  testName: string;

  @ApiProperty()
  modules: string[];

  @ApiProperty({ enum: ExecutionStatus })
  status: ExecutionStatus;

  @ApiProperty()
  results: Array<{
    module: string;
    status: ExecutionStatus;
    output: any;
    error?: string;
    executionTime: number;
  }>;

  @ApiProperty()
  dataFlow: Array<{
    from: string;
    to: string;
    data: any;
    timestamp: Date;
  }>;

  @ApiProperty()
  totalExecutionTime: number;

  @ApiProperty()
  createdAt: Date;
}
