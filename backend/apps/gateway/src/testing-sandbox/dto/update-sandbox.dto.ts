import { PartialType } from '@nestjs/swagger';
import { CreateSandboxDto } from './create-sandbox.dto';

export class UpdateSandboxDto extends PartialType(CreateSandboxDto) {}
