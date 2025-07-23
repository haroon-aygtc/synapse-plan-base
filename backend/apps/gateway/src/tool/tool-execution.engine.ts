import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Tool, ToolExecution } from '@database/entities';
import { ExecuteToolDto } from './dto';
import { ExecutionStatus, EventType } from '@shared/enums';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

@Injectable()
export class ToolExecutionEngine {
  private readonly logger = new Logger(ToolExecutionEngine.name);

  constructor(
    @InjectRepository(Tool)
    private readonly toolRepository: Repository<Tool>,
    @InjectRepository(ToolExecution)
    private readonly toolExecutionRepository: Repository<ToolExecution>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(toolId: string, executeToolDto: ExecuteToolDto) {
    const tool = await this.toolRepository.findOne({ where: { id: toolId } });
    if (!tool) {
      throw new Error(`Tool with ID ${toolId} not found`);
    }

    const executionId = executeToolDto.toolCallId || uuidv4();
    const startTime = Date.now();

    // Create execution record
    const execution = this.toolExecutionRepository.create({
      id: executionId,
      toolId,
      functionName: executeToolDto.functionName,
      parameters: executeToolDto.parameters,
      status: ExecutionStatus.RUNNING,
      callerType: executeToolDto.callerType || 'user',
      callerId: executeToolDto.callerId,
      createdAt: new Date(),
    });

    await this.toolExecutionRepository.save(execution);

    // Emit execution started event
    this.eventEmitter.emit(EventType.TOOL_EXECUTION_STARTED, {
      toolId,
      executionId,
      functionName: executeToolDto.functionName,
      parameters: executeToolDto.parameters,
    });

    try {
      // Execute the tool
      const result = await this.performToolExecution(tool, executeToolDto);
      const executionTime = Date.now() - startTime;

      // Update execution record
      execution.status = ExecutionStatus.COMPLETED;
      execution.result = result;
      execution.executionTimeMs = executionTime;
      execution.cost = this.calculateCost(tool, executionTime);
      execution.completedAt = new Date();

      await this.toolExecutionRepository.save(execution);

      // Emit execution completed event
      this.eventEmitter.emit(EventType.TOOL_EXECUTION_COMPLETED, {
        toolId,
        executionId,
        result,
        executionTime,
        cost: execution.cost,
      });

      return {
        id: executionId,
        toolId,
        functionName: executeToolDto.functionName,
        parameters: executeToolDto.parameters,
        result,
        status: ExecutionStatus.COMPLETED,
        executionTime,
        cost: execution.cost,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      // Update execution record with error
      execution.status = ExecutionStatus.FAILED;
      execution.error = error.message;
      execution.executionTimeMs = executionTime;
      execution.completedAt = new Date();

      await this.toolExecutionRepository.save(execution);

      // Emit execution failed event
      this.eventEmitter.emit(EventType.TOOL_EXECUTION_FAILED, {
        toolId,
        executionId,
        error: error.message,
        executionTime,
      });

      throw error;
    }
  }

  private async performToolExecution(tool: Tool, executeToolDto: ExecuteToolDto) {
    const { endpoint, method, headers } = tool;
    const { parameters } = executeToolDto;

    try {
      const response = await axios({
        url: endpoint,
        method: method.toLowerCase() as any,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        data: method.toUpperCase() !== 'GET' ? parameters : undefined,
        params: method.toUpperCase() === 'GET' ? parameters : undefined,
        timeout: executeToolDto.timeout || 30000,
      });

      return response.data;
    } catch (error) {
      this.logger.error(`Tool execution failed: ${error.message}`, error.stack);
      throw new Error(`Tool execution failed: ${error.message}`);
    }
  }

  private calculateCost(tool: Tool, executionTimeMs: number): number {
    // Simple cost calculation based on execution time
    // In a real implementation, this would be more sophisticated
    const baseCost = 0.001; // $0.001 per execution
    const timeCost = (executionTimeMs / 1000) * 0.0001; // $0.0001 per second
    return baseCost + timeCost;
  }
}
