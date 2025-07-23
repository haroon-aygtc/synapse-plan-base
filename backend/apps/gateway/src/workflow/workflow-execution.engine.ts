import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Workflow, WorkflowExecution } from '@database/entities';
import { ExecuteWorkflowDto } from './dto';
import { ExecutionStatus, EventType } from '@shared/enums';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class WorkflowExecutionEngine {
  private readonly logger = new Logger(WorkflowExecutionEngine.name);
  private activeExecutions = new Map<string, any>();

  constructor(
    @InjectRepository(Workflow)
    private readonly workflowRepository: Repository<Workflow>,
    @InjectRepository(WorkflowExecution)
    private readonly workflowExecutionRepository: Repository<WorkflowExecution>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(workflowId: string, executeWorkflowDto: ExecuteWorkflowDto) {
    const workflow = await this.workflowRepository.findOne({ where: { id: workflowId } });
    if (!workflow) {
      throw new Error(`Workflow with ID ${workflowId} not found`);
    }

    const executionId = executeWorkflowDto.executionId || uuidv4();
    const startTime = Date.now();

    // Create execution record
    const execution = this.workflowExecutionRepository.create({
      id: executionId,
      workflowId,
      status: ExecutionStatus.RUNNING,
      input: executeWorkflowDto.input,
      variables: executeWorkflowDto.variables || {},
      completedSteps: [],
      createdAt: new Date(),
    });

    await this.workflowExecutionRepository.save(execution);
    this.activeExecutions.set(executionId, { execution, startTime });

    // Emit execution started event
    this.eventEmitter.emit(EventType.WORKFLOW_EXECUTION_STARTED, {
      workflowId,
      executionId,
      input: executeWorkflowDto.input,
      variables: executeWorkflowDto.variables,
    });

    try {
      // Execute the workflow
      const result = await this.performWorkflowExecution(workflow, execution);
      const executionTime = Date.now() - startTime;

      // Update execution record
      execution.status = ExecutionStatus.COMPLETED;
      execution.output = result;
      execution.completedAt = new Date();

      await this.workflowExecutionRepository.save(execution);
      this.activeExecutions.delete(executionId);

      // Emit execution completed event
      this.eventEmitter.emit(EventType.WORKFLOW_EXECUTION_COMPLETED, {
        workflowId,
        executionId,
        result,
        executionTime,
      });

      return execution;
    } catch (error) {
      // Update execution record with error
      execution.status = ExecutionStatus.FAILED;
      execution.error = error.message;
      execution.completedAt = new Date();

      await this.workflowExecutionRepository.save(execution);
      this.activeExecutions.delete(executionId);

      // Emit execution failed event
      this.eventEmitter.emit(EventType.WORKFLOW_EXECUTION_FAILED, {
        workflowId,
        executionId,
        error: error.message,
      });

      throw error;
    }
  }

  async cancel(executionId: string) {
    const execution = await this.workflowExecutionRepository.findOne({
      where: { id: executionId },
    });

    if (!execution) {
      throw new Error(`Execution with ID ${executionId} not found`);
    }

    if (execution.status !== ExecutionStatus.RUNNING) {
      throw new Error(`Execution ${executionId} is not running`);
    }

    execution.status = ExecutionStatus.CANCELLED;
    execution.completedAt = new Date();

    await this.workflowExecutionRepository.save(execution);
    this.activeExecutions.delete(executionId);

    return execution;
  }

  async pause(executionId: string) {
    const execution = await this.workflowExecutionRepository.findOne({
      where: { id: executionId },
    });

    if (!execution) {
      throw new Error(`Execution with ID ${executionId} not found`);
    }

    if (execution.status !== ExecutionStatus.RUNNING) {
      throw new Error(`Execution ${executionId} is not running`);
    }

    execution.status = ExecutionStatus.PAUSED;
    await this.workflowExecutionRepository.save(execution);

    return execution;
  }

  async resume(executionId: string) {
    const execution = await this.workflowExecutionRepository.findOne({
      where: { id: executionId },
    });

    if (!execution) {
      throw new Error(`Execution with ID ${executionId} not found`);
    }

    if (execution.status !== ExecutionStatus.PAUSED) {
      throw new Error(`Execution ${executionId} is not paused`);
    }

    execution.status = ExecutionStatus.RUNNING;
    await this.workflowExecutionRepository.save(execution);

    // Continue execution from where it left off
    const workflow = await this.workflowRepository.findOne({
      where: { id: execution.workflowId },
    });

    if (workflow) {
      this.performWorkflowExecution(workflow, execution).catch((error) => {
        this.logger.error(`Failed to resume workflow execution: ${error.message}`);
      });
    }

    return execution;
  }

  private async performWorkflowExecution(workflow: Workflow, execution: WorkflowExecution) {
    const { definition } = workflow;
    const { nodes, edges } = definition;

    // Simple workflow execution simulation
    // In a real implementation, this would be much more sophisticated
    const startNode = nodes.find((node: any) => node.type === 'start');
    if (!startNode) {
      throw new Error('Workflow must have a start node');
    }

    let currentNode = startNode;
    const executedSteps: string[] = [];
    let result = execution.input;

    while (currentNode && currentNode.type !== 'end') {
      executedSteps.push(currentNode.id);
      
      // Process current node
      result = await this.processNode(currentNode, result, execution);
      
      // Find next node
      const nextEdge = edges.find((edge: any) => edge.source === currentNode.id);
      if (nextEdge) {
        currentNode = nodes.find((node: any) => node.id === nextEdge.target);
      } else {
        break;
      }

      // Update execution progress
      execution.completedSteps = executedSteps;
      execution.currentStep = currentNode?.id;
      await this.workflowExecutionRepository.save(execution);
    }

    return result;
  }

  private async processNode(node: any, input: any, execution: WorkflowExecution) {
    this.logger.debug(`Processing node: ${node.id} (${node.type})`);

    switch (node.type) {
      case 'agent':
        // In a real implementation, this would call the agent service
        return { ...input, agentResult: 'Agent processed the input' };
      
      case 'tool':
        // In a real implementation, this would call the tool service
        return { ...input, toolResult: 'Tool processed the input' };
      
      case 'condition':
        // Simple condition evaluation
        const condition = node.data?.condition || 'true';
        return { ...input, conditionResult: eval(condition) };
      
      case 'loop':
        // Simple loop implementation
        const iterations = node.data?.iterations || 1;
        const loopResults = [];
        for (let i = 0; i < iterations; i++) {
          loopResults.push({ iteration: i, input });
        }
        return { ...input, loopResults };
      
      default:
        return input;
    }
  }
}
