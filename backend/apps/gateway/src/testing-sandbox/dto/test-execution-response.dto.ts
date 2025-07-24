import { ApiProperty } from '@nestjs/swagger';
import { ExecutionStatus } from '@shared/enums';

export class TestExecutionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  sandboxId: string;

  @ApiProperty()
  testType: string;

  @ApiProperty()
  testData: any;

  @ApiProperty({ enum: ExecutionStatus })
  status: ExecutionStatus;

  @ApiProperty()
  output?: any;

  @ApiProperty()
  error?: string;

  @ApiProperty()
  metrics: {
    executionTime: number;
    memoryUsage: number;
    cpuUsage: number;
    networkCalls: number;
  };

  @ApiProperty()
  traces: Array<{
    timestamp: Date;
    level: string;
    message: string;
    data?: any;
  }>;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  organizationId: string;

  @ApiProperty()
  startedAt: Date;

  @ApiProperty()
  completedAt?: Date;
}
