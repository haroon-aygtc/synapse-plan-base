import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateHITLRequestDto } from './create-hitl-request.dto';

export class UpdateHITLRequestDto extends PartialType(
  OmitType(CreateHITLRequestDto, [
    'sourceType',
    'sourceId',
    'executionId',
    'executionContext',
  ] as const),
) {}
