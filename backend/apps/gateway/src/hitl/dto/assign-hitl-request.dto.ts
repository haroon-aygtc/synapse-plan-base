import { IsUUID, IsOptional, IsArray, IsString } from 'class-validator';

export class AssignHITLRequestDto {
  @IsUUID()
  @IsOptional()
  assigneeId?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  assigneeRoles?: string[];

  @IsArray()
  @IsUUID(4, { each: true })
  @IsOptional()
  assigneeUsers?: string[];

  @IsString()
  @IsOptional()
  reason?: string;
}
