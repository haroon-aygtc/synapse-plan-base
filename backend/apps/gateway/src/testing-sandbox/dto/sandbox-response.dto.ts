import { ApiProperty } from '@nestjs/swagger';
import { ExecutionStatus } from '@shared/enums';

export class SandboxResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description?: string;

  @ApiProperty({ enum: ['agent', 'tool', 'workflow', 'integration'] })
  type: string;

  @ApiProperty({ enum: ExecutionStatus })
  status: ExecutionStatus;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  organizationId: string;

  @ApiProperty()
  resourceLimits: {
    memory: string;
    cpu: string;
    timeout: number;
    networkAccess: boolean;
    allowedPorts: number[];
  };

  @ApiProperty()
  isolationConfig: any;

  @ApiProperty()
  containerInfo?: {
    containerId: string;
    status: string;
    createdAt: Date;
    resourceMonitorId?: string;
  };

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
