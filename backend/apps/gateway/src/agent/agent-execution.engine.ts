import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Agent, AgentExecution } from '@database/entities';
import { AgentEventType, ExecutionStatus } from '@shared/enums';
import { WebSocketService } from '../websocket/websocket.service';
import { SessionService } from '../session/session.service';
import { ToolService } from '../tool/tool.service';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { v4 as uuidv4 } from 'uuid';
import OpenAI from 'openai';
import { HITLService } from '../hitl/hitl.service';
import { HITLRequestType, HITLRequestPriority } from '@shared/enums';

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
  private readonly openai: OpenAI;

  constructor(
    @InjectRepository(AgentExecution)
    private readonly agentExecutionRepository: Repository<AgentExecution>,
    private readonly sessionService: SessionService,
    private readonly websocketService: WebSocketService,
    private readonly toolService: ToolService,
    private readonly knowledgeService: KnowledgeService,
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
    private readonly hitlService: HITLService,
  ) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

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

      // Build messages for OpenAI
      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        {
          role: 'system',
          content: agent.prompt,
        },
        ...conversationHistory.map((msg: any) => ({
          role: msg.role,
          content: msg.content,
        })),
        {
          role: 'user',
          content: options.input,
        },
      ];

      // Prepare tools if agent has them
      const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [];
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
          // Fix the knowledge search event type
          this.eventEmitter.emit(AgentEventType.KNOWLEDGE_SEARCH_PERFORMED, {
            executionId,
            agentId: agent.id,
            query: options.input,
            knowledgeSources: agent.knowledgeSources,
            timestamp: new Date(),
          });

          // Fix the search method call with proper type annotation
          interface SearchDocumentsParams {
            query: string;
            filters?: {
              documentTypes?: string[];
              organizationId?: string;
            };
          }

          interface SearchResult {
            results: Array<{
              content: string;
              source: string;
            }>;
            sources: string[];
          }

          const searchResults = (await this.knowledgeService.searchDocuments({
            query: options.input,
            filters: {
              documentTypes: agent.knowledgeSources,
              organizationId,
            },
          } as SearchDocumentsParams)) as SearchResult;

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

      // Execute with OpenAI
      const completion = await this.openai.chat.completions.create({
        model: agent.model,
        messages,
        temperature: agent.temperature,
        max_tokens: agent.maxTokens,
        tools: tools.length > 0 ? tools : undefined,
        tool_choice: tools.length > 0 ? 'auto' : undefined,
      });

      const choice = completion.choices[0];
      let finalOutput = choice.message.content || '';
      const tokensUsed = completion.usage?.total_tokens || 0;

      // Handle tool calls
      if (choice.message.tool_calls) {
        for (const toolCall of choice.message.tool_calls) {
          const toolStartTime = Date.now();

          try {
            // Fix the tool call event types
            this.eventEmitter.emit(AgentEventType.TOOL_EXECUTION_STARTED, {
              executionId,
              agentId: agent.id,
              toolId: toolCall.function.name,
              input: JSON.parse(toolCall.function.arguments),
              timestamp: new Date(),
            });

            // Use the tool execution engine instead
            const toolResult = (await this.toolService.test(
              toolCall.function.name,
              {
                functionName: toolCall.function.name,
                parameters: JSON.parse(toolCall.function.arguments),
                expectedResult: null,
              } as ToolTestParams,
            )) as ToolTestResult;

            // Get the output safely without type assertions
            const output =
              toolResult.success && toolResult.result !== undefined
                ? toolResult.result
                : { error: toolResult.error || 'Unknown error' };

            toolCalls.push({
              toolId: toolCall.function.name,
              input: JSON.parse(toolCall.function.arguments),
              output,
              executionTime: Date.now() - toolStartTime,
            });

            // Fix the tool call event types
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

        // Get final response with tool results
        const toolMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] =
          [
            ...messages,
            choice.message,
            ...choice.message.tool_calls.map((toolCall, index) => ({
              role: 'tool' as const,
              tool_call_id: toolCall.id,
              content: JSON.stringify(
                toolCalls[index]?.output || { error: 'Tool execution failed' },
              ),
            })),
          ];

        const finalCompletion = await this.openai.chat.completions.create({
          model: agent.model,
          messages: toolMessages,
          temperature: agent.temperature,
          max_tokens: agent.maxTokens,
        });

        finalOutput =
          finalCompletion.choices[0]?.message?.content || finalOutput;
      }

      const executionTime = Date.now() - startTime;
      const cost = this.calculateCost(agent.model, tokensUsed);

      // Update execution record
      execution.output = finalOutput;
      execution.status = ExecutionStatus.COMPLETED;
      execution.tokensUsed = tokensUsed;
      execution.cost = cost;
      execution.executionTimeMs = executionTime;
      execution.completedAt = new Date();
      execution.metadata = {
        ...execution.metadata,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        knowledgeSearches:
          knowledgeSearches.length > 0 ? knowledgeSearches : undefined,
      };

      await this.agentExecutionRepository.save(execution);

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
