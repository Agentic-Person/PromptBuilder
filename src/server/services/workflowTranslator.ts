import { N8nWorkflow, N8nNode, N8nConnections } from './n8nClient';

// Types for our visual workflow format
export interface PromptBuilderNode {
  id: string;
  type: 'prompt' | 'router' | 'validator' | 'integration';
  position: { x: number; y: number };
  data: {
    label: string;
    prompt?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    validationRules?: string[];
    conditions?: string[];
    integrationType?: string;
    [key: string]: any;
  };
}

export interface PromptBuilderEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface PromptBuilderWorkflow {
  id: string;
  name: string;
  description?: string;
  config: {
    nodes: PromptBuilderNode[];
    edges: PromptBuilderEdge[];
  };
}

export class WorkflowTranslator {
  
  translateToN8n(workflow: PromptBuilderWorkflow): N8nWorkflow {
    console.log('Translating workflow to n8n format:', workflow.name);
    
    // Add a manual trigger as the first node
    const triggerNode: N8nNode = {
      id: 'trigger',
      name: 'Manual Trigger',
      type: 'n8n-nodes-base.manualTrigger',
      typeVersion: 1,
      position: [100, 100],
      parameters: {}
    };

    // Translate all nodes
    const translatedNodes = workflow.config.nodes.map(node => 
      this.translateNode(node)
    );

    // Add trigger node at the beginning
    const allNodes = [triggerNode, ...translatedNodes];

    // Translate connections
    const connections = this.translateConnections(workflow.config.edges, workflow.config.nodes);

    return {
      name: workflow.name,
      nodes: allNodes,
      connections,
      active: false,
      settings: {
        executionOrder: 'v1'
      }
    };
  }

  private translateNode(node: PromptBuilderNode): N8nNode {
    const baseNode: N8nNode = {
      id: node.id,
      name: node.data.label,
      type: '',
      typeVersion: 1,
      position: [node.position.x, node.position.y],
      parameters: {}
    };

    switch (node.type) {
      case 'prompt':
        return this.createPromptNode(node, baseNode);
      case 'router':
        return this.createRouterNode(node, baseNode);
      case 'validator':
        return this.createValidatorNode(node, baseNode);
      case 'integration':
        return this.createIntegrationNode(node, baseNode);
      default:
        throw new Error(`Unknown node type: ${node.type}`);
    }
  }

  private createPromptNode(node: PromptBuilderNode, baseNode: N8nNode): N8nNode {
    const model = node.data.model || 'gpt-3.5-turbo';
    const isOpenAI = model.startsWith('gpt');
    const isClaude = model.startsWith('claude');

    if (isOpenAI) {
      return {
        ...baseNode,
        type: 'n8n-nodes-base.httpRequest',
        parameters: {
          url: 'https://api.openai.com/v1/chat/completions',
          authentication: 'predefinedCredentialType',
          nodeCredentialType: 'openAiApi',
          method: 'POST',
          sendHeaders: true,
          headerParameters: {
            parameters: [
              {
                name: 'Content-Type',
                value: 'application/json'
              }
            ]
          },
          sendBody: true,
          bodyContentType: 'json',
          jsonBody: JSON.stringify({
            model: model,
            messages: [
              {
                role: 'user',
                content: node.data.prompt || '{{ $json.input }}'
              }
            ],
            temperature: node.data.temperature || 0.7,
            max_tokens: node.data.maxTokens || 1000
          }),
          options: {
            response: {
              fullResponse: false
            }
          }
        }
      };
    } else if (isClaude) {
      return {
        ...baseNode,
        type: 'n8n-nodes-base.httpRequest',
        parameters: {
          url: 'https://api.anthropic.com/v1/messages',
          authentication: 'predefinedCredentialType',
          nodeCredentialType: 'anthropicApi',
          method: 'POST',
          sendHeaders: true,
          headerParameters: {
            parameters: [
              {
                name: 'Content-Type',
                value: 'application/json'
              },
              {
                name: 'anthropic-version',
                value: '2023-06-01'
              }
            ]
          },
          sendBody: true,
          bodyContentType: 'json',
          jsonBody: JSON.stringify({
            model: model,
            max_tokens: node.data.maxTokens || 1000,
            messages: [
              {
                role: 'user',
                content: node.data.prompt || '{{ $json.input }}'
              }
            ]
          })
        }
      };
    }

    // Default to OpenAI format
    return this.createPromptNode({
      ...node,
      data: { ...node.data, model: 'gpt-3.5-turbo' }
    }, baseNode);
  }

  private createRouterNode(node: PromptBuilderNode, baseNode: N8nNode): N8nNode {
    const conditions = node.data.conditions || [];
    
    return {
      ...baseNode,
      type: 'n8n-nodes-base.function',
      parameters: {
        functionCode: `
// Router Logic
const input = items[0].json;
${conditions.map((condition, index) => `
// Condition ${index + 1}: ${condition}
if (${this.translateCondition(condition)}) {
  return [{ json: { ...input, routePath: '${index}' } }];
}
`).join('')}

// Default path
return [{ json: { ...input, routePath: 'default' } }];
        `.trim()
      }
    };
  }

  private createValidatorNode(node: PromptBuilderNode, baseNode: N8nNode): N8nNode {
    const rules = node.data.validationRules || [];
    
    return {
      ...baseNode,
      type: 'n8n-nodes-base.function',
      parameters: {
        functionCode: `
// Validation Logic
const input = items[0].json;
const validationResults = [];

${rules.map((rule, index) => `
// Rule ${index + 1}: ${rule}
try {
  const result = ${this.translateValidationRule(rule)};
  validationResults.push({ rule: '${rule}', passed: result });
} catch (error) {
  validationResults.push({ rule: '${rule}', passed: false, error: error.message });
}
`).join('')}

const allPassed = validationResults.every(r => r.passed);

return [{
  json: {
    ...input,
    validation: {
      passed: allPassed,
      results: validationResults
    }
  }
}];
        `.trim()
      }
    };
  }

  private createIntegrationNode(node: PromptBuilderNode, baseNode: N8nNode): N8nNode {
    const integrationType = node.data.integrationType;

    switch (integrationType) {
      case 'gmail':
        return {
          ...baseNode,
          type: 'n8n-nodes-base.gmail',
          parameters: {
            operation: 'getAll',
            returnAll: false,
            limit: 50,
            filters: {
              query: 'is:unread newer_than:1d'
            }
          },
          credentials: {
            gmailOAuth2: 'gmail_account'
          }
        };

      case 'slack':
        return {
          ...baseNode,
          type: 'n8n-nodes-base.slack',
          parameters: {
            operation: 'postMessage',
            channel: node.data.channel || '#general',
            text: '{{ $json.message || "Workflow notification" }}',
            attachments: []
          },
          credentials: {
            slackOAuth2: 'slack_account'
          }
        };

      case 'webhook':
        return {
          ...baseNode,
          type: 'n8n-nodes-base.httpRequest',
          parameters: {
            url: node.data.webhookUrl || '',
            method: 'POST',
            sendBody: true,
            bodyContentType: 'json',
            jsonBody: '{{ JSON.stringify($json) }}'
          }
        };

      default:
        return {
          ...baseNode,
          type: 'n8n-nodes-base.function',
          parameters: {
            functionCode: `
// Generic Integration
console.log('Integration node:', '${integrationType}');
return items;
            `.trim()
          }
        };
    }
  }

  private translateConnections(edges: PromptBuilderEdge[], nodes: PromptBuilderNode[]): N8nConnections {
    const connections: N8nConnections = {};

    // Always connect trigger to first node
    const firstNode = nodes[0];
    if (firstNode) {
      connections['trigger'] = {
        main: [[{ node: firstNode.id, type: 'main', index: 0 }]]
      };
    }

    edges.forEach(edge => {
      if (!connections[edge.source]) {
        connections[edge.source] = { main: [] };
      }

      if (!connections[edge.source].main) {
        connections[edge.source].main = [];
      }

      // Handle multiple outputs (for router nodes)
      const outputIndex = edge.sourceHandle ? parseInt(edge.sourceHandle) || 0 : 0;
      
      while (connections[edge.source].main!.length <= outputIndex) {
        connections[edge.source].main!.push([]);
      }

      connections[edge.source].main![outputIndex].push({
        node: edge.target,
        type: 'main',
        index: 0
      });
    });

    return connections;
  }

  private translateCondition(condition: string): string {
    // Convert natural language conditions to JavaScript
    // This is a simplified version - would need more sophisticated parsing
    return condition
      .replace(/sentiment/g, 'input.sentiment')
      .replace(/urgency/g, 'input.urgency')
      .replace(/contains/g, 'input.content.includes')
      .replace(/is/g, '===')
      .replace(/greater than/g, '>')
      .replace(/less than/g, '<');
  }

  private translateValidationRule(rule: string): string {
    // Convert validation rules to JavaScript
    // This is a simplified version
    if (rule.includes('length')) {
      return 'input.content && input.content.length > 0';
    }
    if (rule.includes('contains')) {
      const match = rule.match(/contains "([^"]+)"/);
      const searchTerm = match ? match[1] : '';
      return `input.content && input.content.includes('${searchTerm}')`;
    }
    if (rule.includes('not empty')) {
      return 'input.content && input.content.trim().length > 0';
    }
    
    return 'true'; // Default to pass
  }
}

export const workflowTranslator = new WorkflowTranslator();