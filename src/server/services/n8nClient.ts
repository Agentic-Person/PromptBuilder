import { env } from '@/env';

export interface N8nWorkflow {
  id?: string;
  name: string;
  nodes: N8nNode[];
  connections: N8nConnections;
  active?: boolean;
  settings?: {
    executionOrder?: 'v0' | 'v1';
  };
}

export interface N8nNode {
  id: string;
  name: string;
  type: string;
  typeVersion: number;
  position: [number, number];
  parameters?: Record<string, any>;
  credentials?: Record<string, string>;
}

export interface N8nConnections {
  [nodeId: string]: {
    main?: Array<Array<{ node: string; type: string; index: number }>>;
  };
}

export interface N8nExecutionResult {
  id: string;
  finished: boolean;
  mode: 'trigger' | 'webhook' | 'manual';
  startedAt: string;
  stoppedAt?: string;
  workflowId: string;
  data?: {
    resultData: {
      runData: Record<string, any>;
    };
  };
  error?: {
    message: string;
    stack?: string;
  };
}

export interface N8nCredential {
  id?: string;
  name: string;
  type: string;
  data: Record<string, any>;
}

export class N8nClient {
  private baseUrl: string;
  private auth: { user: string; password: string };

  constructor(baseUrl?: string, auth?: { user: string; password: string }) {
    this.baseUrl = baseUrl || env.N8N_BASE_URL || 'http://localhost:5678';
    this.auth = auth || {
      user: 'admin',
      password: env.N8N_API_KEY || 'admin'
    };
  }

  private async makeRequest<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}/api/v1${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Basic ${btoa(`${this.auth.user}:${this.auth.password}`)}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`n8n API Error (${response.status}): ${errorText}`);
    }

    return response.json();
  }

  // Workflow Management
  async createWorkflow(workflow: Omit<N8nWorkflow, 'id'>): Promise<N8nWorkflow> {
    console.log('Creating n8n workflow:', workflow.name);
    return this.makeRequest<N8nWorkflow>('/workflows', {
      method: 'POST',
      body: JSON.stringify(workflow),
    });
  }

  async updateWorkflow(id: string, workflow: Partial<N8nWorkflow>): Promise<N8nWorkflow> {
    console.log('Updating n8n workflow:', id);
    return this.makeRequest<N8nWorkflow>(`/workflows/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(workflow),
    });
  }

  async getWorkflow(id: string): Promise<N8nWorkflow> {
    return this.makeRequest<N8nWorkflow>(`/workflows/${id}`);
  }

  async deleteWorkflow(id: string): Promise<boolean> {
    await this.makeRequest(`/workflows/${id}`, {
      method: 'DELETE',
    });
    return true;
  }

  async listWorkflows(): Promise<N8nWorkflow[]> {
    const response = await this.makeRequest<{ data: N8nWorkflow[] }>('/workflows');
    return response.data || [];
  }

  // Workflow Execution
  async executeWorkflow(
    workflowId: string, 
    inputData?: Record<string, any>
  ): Promise<N8nExecutionResult> {
    console.log('Executing n8n workflow:', workflowId, 'with data:', inputData);
    
    const body: any = {};
    if (inputData) {
      body.data = inputData;
    }

    return this.makeRequest<N8nExecutionResult>(`/workflows/${workflowId}/execute`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async getExecution(executionId: string): Promise<N8nExecutionResult> {
    return this.makeRequest<N8nExecutionResult>(`/executions/${executionId}`);
  }

  async getExecutions(workflowId?: string, limit = 20): Promise<N8nExecutionResult[]> {
    const params = new URLSearchParams();
    if (workflowId) params.append('workflowId', workflowId);
    params.append('limit', limit.toString());

    const response = await this.makeRequest<{ data: N8nExecutionResult[] }>(
      `/executions?${params.toString()}`
    );
    return response.data || [];
  }

  // Credentials Management
  async createCredential(credential: Omit<N8nCredential, 'id'>): Promise<N8nCredential> {
    console.log('Creating n8n credential:', credential.name);
    return this.makeRequest<N8nCredential>('/credentials', {
      method: 'POST',
      body: JSON.stringify(credential),
    });
  }

  async getCredentials(): Promise<N8nCredential[]> {
    const response = await this.makeRequest<{ data: N8nCredential[] }>('/credentials');
    return response.data || [];
  }

  // Health Check
  async healthCheck(): Promise<{ status: 'ok' | 'error'; version?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/healthz`);
      if (response.ok) {
        return { status: 'ok' };
      }
      return { status: 'error' };
    } catch (error) {
      console.error('n8n health check failed:', error);
      return { status: 'error' };
    }
  }

  // Activate/Deactivate workflows
  async activateWorkflow(id: string): Promise<N8nWorkflow> {
    return this.updateWorkflow(id, { active: true });
  }

  async deactivateWorkflow(id: string): Promise<N8nWorkflow> {
    return this.updateWorkflow(id, { active: false });
  }
}

// Export singleton instance
export const n8nClient = new N8nClient();