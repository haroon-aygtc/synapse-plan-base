import {
  IsUUID,
  IsString,
  IsOptional,
  IsArray,
  ValidateIf,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class AssignHITLRequestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  assigneeRoles?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  assigneeUsers?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;

  @ValidateIf((o) => !o.assigneeId && !o.assigneeRoles && !o.assigneeUsers)
  @IsString({ message: 'At least one assignment target must be provided' })
  _validation?: never;
}
