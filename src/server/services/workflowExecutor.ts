import { TRPCError } from '@trpc/server';
import { n8nClient, N8nExecutionResult } from './n8nClient';
import { WorkflowTranslator, PromptBuilderWorkflow } from './workflowTranslator';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/env';

export interface ExecutionRequest {
  chainId: string;
  orgId: string;
  userId: string;
  inputData: Record<string, any>;
  testMode?: boolean;
}

export interface ExecutionResponse {
  executionId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  output?: any;
  error?: string;
  metrics?: {
    startTime: string;
    endTime?: string;
    duration?: number;
    tokensUsed?: number;
    cost?: number;
  };
}

export class WorkflowExecutor {
  private supabase;
  private n8nWorkflowCache: Map<string, string> = new Map(); // chainId -> n8nWorkflowId

  constructor() {
    this.supabase = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.SUPABASE_SERVICE_KEY
    );
  }

  async executeWorkflow(request: ExecutionRequest): Promise<ExecutionResponse> {
    console.log('Executing workflow:', request.chainId);
    
    try {
      // Validate org access
      if (!await this.validateOrgAccess(request.userId, request.orgId)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'User does not have access to this organization',
        });
      }
      
      // 1. Get the prompt chain from database
      const promptChain = await this.getPromptChain(request.chainId, request.orgId);
      
      // 2. Create execution record
      const execution = await this.createExecutionRecord(request, promptChain);
      
      // 3. Deploy workflow to n8n if needed
      const n8nWorkflowId = await this.deployToN8n(promptChain, request.orgId);
      
      // 4. Execute the workflow
      const n8nResult = await this.executeN8nWorkflow(n8nWorkflowId, request.inputData);
      
      // 5. Process results and update execution record
      const response = await this.processExecutionResult(execution.id, n8nResult);
      
      return response;
    } catch (error) {
      console.error('Workflow execution failed:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Workflow execution failed',
      });
    }
  }

  private async getPromptChain(chainId: string, orgId: string): Promise<PromptBuilderWorkflow> {
    const { data, error } = await this.supabase
      .from('prompt_chains')
      .select('*')
      .eq('id', chainId)
      .eq('org_id', orgId)
      .single();

    if (error || !data) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Workflow not found',
      });
    }

    return {
      id: data.id,
      name: data.name,
      description: data.description,
      config: data.config,
    };
  }

  private async createExecutionRecord(
    request: ExecutionRequest,
    promptChain: PromptBuilderWorkflow
  ) {
    const { data, error } = await this.supabase
      .from('prompt_executions')
      .insert({
        chain_id: request.chainId,
        org_id: request.orgId,
        status: 'pending',
        input_data: request.inputData,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error || !data) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create execution record',
      });
    }

    return data;
  }

  private async deployToN8n(promptChain: PromptBuilderWorkflow, orgId: string): Promise<string> {
    // Check cache first
    const cachedId = this.n8nWorkflowCache.get(promptChain.id);
    if (cachedId) {
      console.log('Using cached n8n workflow:', cachedId);
      return cachedId;
    }

    // Create translator with orgId for multi-tenancy
    const workflowTranslator = new WorkflowTranslator(orgId);
    
    // Translate to n8n format
    const n8nWorkflow = workflowTranslator.translateToN8n(promptChain);
    
    // Check if workflow already exists in n8n
    const existingWorkflows = await n8nClient.listWorkflows();
    const existing = existingWorkflows.find(w => w.name === n8nWorkflow.name);
    
    let n8nWorkflowId: string;
    
    if (existing && existing.id) {
      // Update existing workflow
      console.log('Updating existing n8n workflow:', existing.id);
      const updated = await n8nClient.updateWorkflow(existing.id, n8nWorkflow);
      n8nWorkflowId = updated.id!;
    } else {
      // Create new workflow
      console.log('Creating new n8n workflow');
      const created = await n8nClient.createWorkflow(n8nWorkflow);
      n8nWorkflowId = created.id!;
    }
    
    // Activate the workflow
    await n8nClient.activateWorkflow(n8nWorkflowId);
    
    // Cache the mapping
    this.n8nWorkflowCache.set(promptChain.id, n8nWorkflowId);
    
    return n8nWorkflowId;
  }

  private async executeN8nWorkflow(
    workflowId: string,
    inputData: Record<string, any>
  ): Promise<N8nExecutionResult> {
    console.log('Executing n8n workflow:', workflowId);
    
    // Execute the workflow
    const execution = await n8nClient.executeWorkflow(workflowId, {
      input: inputData,
      timestamp: new Date().toISOString(),
    });
    
    // Poll for completion if not finished immediately
    if (!execution.finished) {
      return await this.pollExecutionStatus(execution.id);
    }
    
    return execution;
  }

  private async pollExecutionStatus(
    executionId: string,
    maxAttempts = 60,
    intervalMs = 1000
  ): Promise<N8nExecutionResult> {
    console.log('Polling execution status:', executionId);
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const execution = await n8nClient.getExecution(executionId);
      
      if (execution.finished) {
        return execution;
      }
      
      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
    
    throw new Error('Execution timeout - workflow took too long to complete');
  }

  private async processExecutionResult(
    executionId: string,
    n8nResult: N8nExecutionResult
  ): Promise<ExecutionResponse> {
    const status = n8nResult.error ? 'failed' : 'completed';
    const endTime = new Date().toISOString();
    
    // Extract output from n8n result
    const output = this.extractOutput(n8nResult);
    const metrics = this.extractMetrics(n8nResult);
    
    // Update execution record
    const { error } = await this.supabase
      .from('prompt_executions')
      .update({
        status,
        completed_at: endTime,
        output_data: output,
        metrics,
        cost_data: metrics.cost ? { total: metrics.cost, currency: 'USD' } : null,
        error_details: n8nResult.error ? { message: n8nResult.error.message } : null,
      })
      .eq('id', executionId);

    if (error) {
      console.error('Failed to update execution record:', error);
    }

    // Update hourly metrics
    await this.updateHourlyMetrics(executionId, status, metrics);

    return {
      executionId,
      status,
      output,
      error: n8nResult.error?.message,
      metrics: {
        startTime: n8nResult.startedAt,
        endTime: n8nResult.stoppedAt,
        duration: metrics.duration,
        tokensUsed: metrics.tokensUsed,
        cost: metrics.cost,
      },
    };
  }

  private extractOutput(n8nResult: N8nExecutionResult): any {
    if (!n8nResult.data?.resultData?.runData) {
      return null;
    }

    const runData = n8nResult.data.resultData.runData;
    const nodeNames = Object.keys(runData);
    
    // Find the last node's output (excluding trigger)
    const lastNode = nodeNames
      .filter(name => name !== 'trigger')
      .sort((a, b) => {
        const aTime = runData[a]?.[0]?.startTime || 0;
        const bTime = runData[b]?.[0]?.startTime || 0;
        return bTime - aTime;
      })[0];

    if (!lastNode || !runData[lastNode]) {
      return null;
    }

    const nodeExecutions = runData[lastNode];
    const lastExecution = nodeExecutions[nodeExecutions.length - 1];
    
    return lastExecution?.data?.main?.[0]?.[0]?.json || null;
  }

  private extractMetrics(n8nResult: N8nExecutionResult): any {
    const startTime = new Date(n8nResult.startedAt).getTime();
    const endTime = n8nResult.stoppedAt ? new Date(n8nResult.stoppedAt).getTime() : Date.now();
    const duration = endTime - startTime;

    // Extract token usage and cost from node outputs
    let tokensUsed = 0;
    let cost = 0;

    if (n8nResult.data?.resultData?.runData) {
      Object.values(n8nResult.data.resultData.runData).forEach((nodeExecutions: any) => {
        nodeExecutions.forEach((execution: any) => {
          const output = execution?.data?.main?.[0]?.[0]?.json;
          
          // OpenAI response format
          if (output?.usage) {
            tokensUsed += (output.usage.total_tokens || 0);
            // Rough cost calculation (would need proper model pricing)
            cost += (output.usage.total_tokens || 0) * 0.000002;
          }
          
          // Custom metrics from our nodes
          if (output?.metrics) {
            tokensUsed += (output.metrics.tokens || 0);
            cost += (output.metrics.cost || 0);
          }
        });
      });
    }

    return {
      duration,
      tokensUsed,
      cost,
      latency: duration,
    };
  }

  private async updateHourlyMetrics(
    executionId: string,
    status: string,
    metrics: any
  ) {
    // Get execution details
    const { data: execution } = await this.supabase
      .from('prompt_executions')
      .select('chain_id, org_id, started_at')
      .eq('id', executionId)
      .single();

    if (!execution) return;

    // Round to hour
    const hour = new Date(execution.started_at);
    hour.setMinutes(0, 0, 0);

    // Upsert metrics
    const { error } = await this.supabase
      .from('prompt_metrics_hourly')
      .upsert({
        chain_id: execution.chain_id,
        org_id: execution.org_id,
        hour: hour.toISOString(),
        executions: 1,
        total_cost: metrics.cost || 0,
        avg_latency_ms: metrics.latency || 0,
        error_count: status === 'failed' ? 1 : 0,
        success_rate: status === 'completed' ? 100 : 0,
      }, {
        onConflict: 'chain_id,hour',
        ignoreDuplicates: false,
      });

    if (error) {
      console.error('Failed to update hourly metrics:', error);
    }
  }

  private async validateOrgAccess(userId: string, orgId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('org_id')
      .eq('id', userId)
      .single();
    
    if (error || !data) {
      return false;
    }
    
    return data.org_id === orgId;
  }

  // Utility methods for testing and management
  async clearWorkflowCache(chainId?: string) {
    if (chainId) {
      this.n8nWorkflowCache.delete(chainId);
    } else {
      this.n8nWorkflowCache.clear();
    }
  }

  async getExecutionStatus(executionId: string): Promise<ExecutionResponse> {
    const { data, error } = await this.supabase
      .from('prompt_executions')
      .select('*')
      .eq('id', executionId)
      .single();

    if (error || !data) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Execution not found',
      });
    }

    return {
      executionId: data.id,
      status: data.status,
      output: data.output_data,
      error: data.error_details?.message,
      metrics: {
        startTime: data.started_at,
        endTime: data.completed_at,
        duration: data.metrics?.duration,
        tokensUsed: data.metrics?.tokensUsed,
        cost: data.cost_data?.total,
      },
    };
  }
}

export const workflowExecutor = new WorkflowExecutor();