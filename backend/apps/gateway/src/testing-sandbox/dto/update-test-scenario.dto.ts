import { PartialType } from '@nestjs/swagger';
import { CreateTestScenarioDto } from './create-test-scenario.dto';

export class UpdateTestScenarioDto extends PartialType(CreateTestScenarioDto) {}
