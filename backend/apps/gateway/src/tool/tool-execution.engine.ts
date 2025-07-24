import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Tool, ToolExecution } from '@database/entities';
import { ExecuteToolDto } from './dto';
import { ExecutionStatus } from '@shared/enums';
import { HITLService } from '../hitl/hitl.service';
import { HITLRequestType, HITLRequestPriority } from '@shared/enums';
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
    private readonly hitlService: HITLService,
  ) {}

  async execute(
    toolId: string,
    executeToolDto: ExecuteToolDto,
    userId?: string,
    organizationId?: string,
  ) {
    const tool = await this.toolRepository.findOne({ where: { id: toolId } });
    if (!tool) {
      throw new Error(`Tool with ID ${toolId} not found`);
    }

    const executionId = executeToolDto.toolCallId || uuidv4();
    const startTime = Date.now();

    // Handle HITL requests if tool requires approval
    if (tool.requiresApproval && userId && organizationId) {
      const hitlRequest = await this.hitlService.createRequest(
        {
          title: `Tool Execution Approval Required`,
          description: `Tool "${tool.name}" requires approval before execution`,
          type: HITLRequestType.APPROVAL,
          priority: HITLRequestPriority.MEDIUM,
          sourceType: 'tool',
          sourceId: tool.id,
          executionId,
          executionContext: {
            parameters: executeToolDto.parameters,
            functionName: executeToolDto.functionName,
            toolId: tool.id,
          },
        },
        userId,
        organizationId,
      );

      // Create paused execution record
      const execution = this.toolExecutionRepository.create({
        id: executionId,
        toolId,
        sessionId: uuidv4(),
        input: executeToolDto.parameters,
        status: ExecutionStatus.PAUSED,
        context: {
          functionName: executeToolDto.functionName,
          callerType: executeToolDto.callerType || 'user',
          callerId: executeToolDto.callerId,
          hitlRequestId: hitlRequest.id,
        },
        startedAt: new Date(),
        createdAt: new Date(),
      });

      await this.toolExecutionRepository.save(execution);

      return {
        id: executionId,
        toolId,
        functionName: executeToolDto.functionName,
        parameters: executeToolDto.parameters,
        result: 'Execution paused pending approval',
        status: ExecutionStatus.PAUSED,
        executionTime: Date.now() - startTime,
        cost: 0,
        hitlRequestId: hitlRequest.id,
      };
    }

    // Create execution record
    const execution = this.toolExecutionRepository.create({
      id: executionId,
      toolId,
      sessionId: uuidv4(), // Generate session ID
      input: executeToolDto.parameters,
      status: ExecutionStatus.RUNNING,
      context: {
        functionName: executeToolDto.functionName,
        callerType: executeToolDto.callerType || 'user',
        callerId: executeToolDto.callerId,
      },
      startedAt: new Date(),
      createdAt: new Date(),
    });

    await this.toolExecutionRepository.save(execution);

    // Emit execution started event
    this.eventEmitter.emit('tool.execution.started', {
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
      execution.output = result;
      execution.executionTimeMs = executionTime;
      execution.cost = this.calculateCost(tool, executionTime);
      execution.completedAt = new Date();

      await this.toolExecutionRepository.save(execution);

      // Emit execution completed event
      this.eventEmitter.emit('tool.execution.completed', {
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
      this.eventEmitter.emit('tool.execution.failed', {
        toolId,
        executionId,
        error: error.message,
        executionTime,
      });

      throw error;
    }
  }

  private async performToolExecution(
    tool: Tool,
    executeToolDto: ExecuteToolDto,
  ) {
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
