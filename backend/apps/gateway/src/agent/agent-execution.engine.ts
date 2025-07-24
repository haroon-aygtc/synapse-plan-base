import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Agent, AgentExecution } from '@database/entities';
import {
  AgentEventType,
  ExecutionStatus,
  HITLRequestType,
  HITLRequestPriority,
} from '@shared/enums';
import { WebSocketService } from '../websocket/websocket.service';
import { SessionService } from '../session/session.service';
import { ToolService } from '../tool/tool.service';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { AIProviderService } from '../ai-provider/ai-provider.service';
import { ProviderAdapterService } from '../ai-provider/provider-adapter.service';
import { ExecutionType } from '@database/entities/ai-provider-execution.entity';
import { v4 as uuidv4 } from 'uuid';
import { HITLService } from '../hitl/hitl.service';

export interface AgentExecutionOptions {
  input: string;
  sessionId?: string;
  context?: Record<string, any>;
  metadata?: Record<string, any>;
  includeToolCalls?: boolean;
  includeKnowledgeSearch?: boolean;
  streamResponse?: boolean;
}

export interface AgentExecutionResult {
  id: string;
  output: string;
  status: ExecutionStatus;
  tokensUsed?: number;
  cost?: number;
  executionTimeMs: number;
  toolCalls?: Array<{
    toolId: string;
    input: Record<string, any>;
    output: Record<string, any>;
    executionTime: number;
  }>;
  knowledgeSearches?: Array<{
    query: string;
    results: any[];
    sources: string[];
  }>;
  metadata?: Record<string, any>;
}

interface ToolTestParams {
  functionName: string;
  parameters: Record<string, any>;
  expectedResult: any;
}

interface ToolTestResult {
  success: boolean;
  result?: any;
  error?: string;
  executionTime?: number;
}

@Injectable()
export class AgentExecutionEngine {
  private readonly logger = new Logger(AgentExecutionEngine.name);

  constructor(
    @InjectRepository(AgentExecution)
    private readonly agentExecutionRepository: Repository<AgentExecution>,
    private readonly sessionService: SessionService,
    private readonly websocketService: WebSocketService,
    private readonly toolService: ToolService,
    private readonly knowledgeService: KnowledgeService,
    private readonly aiProviderService: AIProviderService,
    private readonly providerAdapter: ProviderAdapterService,
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
    private readonly hitlService: HITLService,
  ) {}

  async executeAgent(
    agent: Agent,
    options: AgentExecutionOptions,
    userId: string,
    organizationId: string,
  ): Promise<AgentExecutionResult> {
    const executionId = uuidv4();
    const startTime = Date.now();

    // Create execution record
    const execution = this.agentExecutionRepository.create({
      id: executionId,
      agentId: agent.id,
      sessionId: options.sessionId || uuidv4(),
      input: options.input,
      status: ExecutionStatus.RUNNING,
      context: options.context || {},
      metadata: options.metadata || {},
      organizationId,
      startedAt: new Date(),
    });

    await this.agentExecutionRepository.save(execution);

    // Emit execution started event
    this.eventEmitter.emit(AgentEventType.AGENT_EXECUTION_STARTED, {
      executionId,
      agentId: agent.id,
      userId,
      organizationId,
      input: options.input,
      timestamp: new Date(),
    });

    // Send real-time update
    await this.websocketService.broadcastToOrganization(
      organizationId,
      'agent_execution_started',
      {
        executionId,
        agentId: agent.id,
        status: ExecutionStatus.RUNNING,
      },
    );

    try {
      // Get session context if sessionId provided
      let sessionContext = null;
      if (options.sessionId) {
        sessionContext = await this.sessionService.getSessionContext(
          options.sessionId,
        );
      }

      // Prepare conversation context
      const conversationHistory =
        sessionContext?.agentContext?.memory?.conversationHistory || [];

      // Build messages for AI provider
      const messages = [
        {
          role: 'system' as const,
          content: agent.prompt,
        },
        ...conversationHistory.map((msg: any) => ({
          role: msg.role as 'system' | 'user' | 'assistant',
          content: msg.content,
        })),
        {
          role: 'user' as const,
          content: options.input,
        },
      ];

      // Prepare tools if agent has them
      const tools: any[] = [];
      const toolCalls: Array<{
        toolId: string;
        input: Record<string, any>;
        output: Record<string, any>;
        executionTime: number;
      }> = [];

      if (
        agent.tools &&
        agent.tools.length > 0 &&
        options.includeToolCalls !== false
      ) {
        for (const toolId of agent.tools) {
          try {
            const tool = await this.toolService.findOne(toolId);
            if (tool && tool.isActive) {
              tools.push({
                type: 'function',
                function: {
                  name: tool.name,
                  description: tool.description || '',
                  parameters: tool.schema,
                },
              });
            }
          } catch (error) {
            this.logger.warn(`Failed to load tool ${toolId}: ${error.message}`);
          }
        }
      }

      // Handle knowledge search if enabled
      const knowledgeSearches: Array<{
        query: string;
        results: any[];
        sources: string[];
      }> = [];

      if (
        agent.knowledgeSources &&
        agent.knowledgeSources.length > 0 &&
        options.includeKnowledgeSearch !== false
      ) {
        try {
          this.eventEmitter.emit(AgentEventType.KNOWLEDGE_SEARCH_PERFORMED, {
            executionId,
            agentId: agent.id,
            query: options.input,
            knowledgeSources: agent.knowledgeSources,
            timestamp: new Date(),
          });

          // Mock knowledge search for now since we don't have the actual implementation
          const searchResults = {
            results: [],
            sources: [],
          };

          if (searchResults && searchResults.results.length > 0) {
            knowledgeSearches.push({
              query: options.input,
              results: searchResults.results,
              sources: searchResults.sources,
            });

            // Add knowledge context to messages
            messages.push({
              role: 'system',
              content: `Relevant knowledge:\n${searchResults.results
                .map(
                  (r: { content: string; source: string }) =>
                    `${r.content}\nSource: ${r.source}\n---`,
                )
                .join('\n')}`,
            });
          }
        } catch (error) {
          this.logger.error(
            `Knowledge search failed for agent ${agent.id}`,
            error,
          );
        }
      }

      // Handle HITL requests if needed
      if (agent.requiresApproval) {
        const hitlRequest = await this.hitlService.createRequest(
          {
            title: `Agent Execution Approval Required`,
            description: `Agent "${agent.name}" requires approval before execution`,
            type: HITLRequestType.APPROVAL,
            priority: HITLRequestPriority.HIGH,
            sourceType: 'agent',
            sourceId: agent.id,
            executionId,
            executionContext: {
              input: options.input,
              agentId: agent.id,
              sessionId: options.sessionId,
            },
          },
          userId,
          organizationId,
        );

        // Pause execution until approval
        execution.status = ExecutionStatus.PAUSED;
        await this.agentExecutionRepository.save(execution);

        // Return paused execution result
        return {
          id: executionId,
          output: 'Execution paused pending approval',
          status: ExecutionStatus.PAUSED,
          executionTimeMs: Date.now() - startTime,
          metadata: {
            hitlRequestId: hitlRequest.id,
            pausedForApproval: true,
          },
        };
      }

      // Select AI provider for execution
      const selectedProvider = await this.aiProviderService.selectProvider(
        organizationId,
        ExecutionType.AGENT,
        agent.model,
        {
          agentId: agent.id,
          userId,
          organizationId,
          estimatedCost: 0.01, // Rough estimate
          maxResponseTime: 30000,
        },
      );

      // Execute with selected provider and streaming support
      const providerResponse = await this.providerAdapter.executeRequest(
        selectedProvider.type,
        selectedProvider.config,
        {
          messages,
          model: agent.model,
          temperature: agent.temperature,
          maxTokens: agent.maxTokens,
          tools: tools.length > 0 ? tools : undefined,
        },
        {
          streamResponse: options.streamResponse,
          onChunk: options.streamResponse
            ? (chunk: string) => {
                // Stream text chunks via WebSocket
                this.websocketService.streamTextChunk(
                  executionId,
                  uuidv4(),
                  chunk,
                  false,
                  1, // Approximate token count per chunk
                  {
                    agentId: agent.id,
                    providerId: selectedProvider.id,
                    model: agent.model,
                  },
                );
              }
            : undefined,
          onComplete: (response) => {
            // Emit completion event
            this.websocketService.streamProviderEvent(
              'provider_complete',
              {
                executionId,
                providerId: selectedProvider.id,
                tokensUsed: response.tokensUsed,
                cost: response.cost,
                executionTime: Date.now() - startTime,
              },
              organizationId,
              options.sessionId,
            );
          },
          onError: (error) => {
            // Emit error event
            this.websocketService.streamProviderEvent(
              'provider_error',
              {
                executionId,
                providerId: selectedProvider.id,
                error: error.message,
                executionTime: Date.now() - startTime,
              },
              organizationId,
              options.sessionId,
            );
          },
        },
      );

      // Emit provider selected event
      await this.websocketService.streamProviderEvent(
        'provider_selected',
        {
          executionId,
          providerId: selectedProvider.id,
          providerType: selectedProvider.type,
          model: agent.model,
          estimatedCost: 0.01,
        },
        organizationId,
        options.sessionId,
      );

      let finalOutput = providerResponse.content;
      const tokensUsed = providerResponse.tokensUsed;
      const cost = providerResponse.cost;

      // Handle tool calls if present in response
      if (providerResponse.toolCalls && providerResponse.toolCalls.length > 0) {
        for (const toolCall of providerResponse.toolCalls) {
          const toolStartTime = Date.now();

          try {
            this.eventEmitter.emit(AgentEventType.TOOL_EXECUTION_STARTED, {
              executionId,
              agentId: agent.id,
              toolId: toolCall.function.name,
              input: JSON.parse(toolCall.function.arguments),
              timestamp: new Date(),
            });

            // Execute tool
            const toolResult = await this.toolService.execute(
              toolCall.function.name,
              {
                functionName: toolCall.function.name,
                parameters: JSON.parse(toolCall.function.arguments),
                callerType: 'agent',
                callerId: agent.id,
              },
              userId,
              organizationId,
              options.sessionId,
            );

            toolCalls.push({
              toolId: toolCall.function.name,
              input: JSON.parse(toolCall.function.arguments),
              output: toolResult.result,
              executionTime: Date.now() - toolStartTime,
            });

            this.eventEmitter.emit(AgentEventType.TOOL_EXECUTION_COMPLETED, {
              executionId,
              agentId: agent.id,
              toolId: toolCall.function.name,
              toolResult,
              timestamp: new Date(),
            });
          } catch (toolError: unknown) {
            this.logger.error(
              `Tool execution failed: ${toolCall.function.name}`,
              toolError,
            );

            toolCalls.push({
              toolId: toolCall.function.name,
              input: JSON.parse(toolCall.function.arguments),
              output: {
                error:
                  toolError instanceof Error
                    ? toolError.message
                    : 'Unknown error',
              },
              executionTime: Date.now() - toolStartTime,
            });
          }
        }

        // Get final response with tool results if needed
        if (toolCalls.length > 0) {
          const toolMessages = [
            ...messages,
            {
              role: 'assistant' as const,
              content: finalOutput,
              tool_calls: providerResponse.toolCalls,
            },
            ...toolCalls.map((toolCall, index) => ({
              role: 'tool' as const,
              tool_call_id:
                providerResponse.toolCalls[index]?.id || `tool_${index}`,
              content: JSON.stringify(toolCall.output),
            })),
          ];

          const finalResponse = await this.providerAdapter.executeRequest(
            selectedProvider.type,
            selectedProvider.config,
            {
              messages: toolMessages,
              model: agent.model,
              temperature: agent.temperature,
              maxTokens: agent.maxTokens,
            },
          );

          finalOutput = finalResponse.content || finalOutput;
        }
      }

      const executionTime = Date.now() - startTime;

      // Update execution record
      execution.output = finalOutput;
      execution.status = ExecutionStatus.COMPLETED;
      execution.tokensUsed = tokensUsed;
      execution.cost = cost;
      execution.executionTimeMs = executionTime;
      execution.completedAt = new Date();
      execution.metadata = {
        ...execution.metadata,
        providerId: selectedProvider.id,
        providerType: selectedProvider.type,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        knowledgeSearches:
          knowledgeSearches.length > 0 ? knowledgeSearches : undefined,
      };

      await this.agentExecutionRepository.save(execution);

      // Record execution in AI provider metrics
      await this.aiProviderService.recordExecution(
        selectedProvider.id,
        ExecutionType.AGENT,
        agent.id,
        agent.model,
        { input: options.input, context: options.context },
        { output: finalOutput },
        tokensUsed,
        cost,
        executionTime,
        organizationId,
        userId,
      );

      // Update session context if sessionId provided
      if (options.sessionId && sessionContext) {
        await this.sessionService.updateSession(options.sessionId, {
          context: {
            conversationHistory: [
              ...conversationHistory,
              {
                role: 'user',
                content: options.input,
                timestamp: new Date(),
              },
              {
                role: 'assistant',
                content: finalOutput,
                timestamp: new Date(),
              },
            ].slice(-20), // Keep last 20 messages
            toolCalls: [
              ...(sessionContext.agentContext?.toolCalls || []),
              ...toolCalls,
            ].slice(-10),
          },
          agentId: agent.id,
        });
      }

      // Emit execution completed event
      this.eventEmitter.emit(AgentEventType.AGENT_EXECUTION_COMPLETED, {
        executionId,
        agentId: agent.id,
        userId,
        organizationId,
        output: finalOutput,
        executionTime,
        tokensUsed,
        cost,
        timestamp: new Date(),
      });

      // Send real-time update
      await this.websocketService.broadcastToOrganization(
        organizationId,
        'agent_execution_completed',
        {
          executionId,
          agentId: agent.id,
          status: ExecutionStatus.COMPLETED,
          output: finalOutput,
          executionTime,
        },
      );

      const result: AgentExecutionResult = {
        id: executionId,
        output: finalOutput,
        status: ExecutionStatus.COMPLETED,
        tokensUsed,
        cost,
        executionTimeMs: executionTime,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        knowledgeSearches:
          knowledgeSearches.length > 0 ? knowledgeSearches : undefined,
        metadata: execution.metadata,
      };

      this.logger.log(
        `Agent execution completed: ${executionId} for agent ${agent.id} (${executionTime}ms)`,
      );

      return result;
    } catch (error: unknown) {
      const executionTime = Date.now() - startTime;

      // Update execution record with error
      execution.status = ExecutionStatus.FAILED;
      execution.error =
        error instanceof Error ? error.message : 'Unknown error';
      execution.executionTimeMs = executionTime;
      execution.completedAt = new Date();
      await this.agentExecutionRepository.save(execution);

      // Emit execution failed event
      this.eventEmitter.emit(AgentEventType.AGENT_EXECUTION_FAILED, {
        executionId,
        agentId: agent.id,
        userId,
        organizationId,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime,
        timestamp: new Date(),
      });

      // Send real-time update
      await this.websocketService.broadcastToOrganization(
        organizationId,
        'agent_execution_failed',
        {
          executionId,
          agentId: agent.id,
          status: ExecutionStatus.FAILED,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      );

      this.logger.error(
        `Agent execution failed: ${executionId} for agent ${agent.id}`,
        error,
      );

      throw error;
    }
  }

  private calculateCost(model: string, tokens: number): number {
    // Simplified cost calculation - in production, use actual pricing
    const costPerToken: Record<string, number> = {
      'gpt-4': 0.00003,
      'gpt-3.5-turbo': 0.000002,
      'claude-3-opus': 0.000015,
      'claude-3-sonnet': 0.000003,
      'gemini-pro': 0.000001,
      'mistral-large': 0.000006,
    };

    return (costPerToken[model] || costPerToken['gpt-3.5-turbo']) * tokens;
  }
}
