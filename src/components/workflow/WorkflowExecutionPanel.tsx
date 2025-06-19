'use client';

import React, { useState } from 'react';
import { api } from '@/lib/trpc/client';
import ExecutionStatus from './ExecutionStatus';

interface WorkflowExecutionPanelProps {
  workflowId: string;
  workflowName: string;
}

export default function WorkflowExecutionPanel({ 
  workflowId, 
  workflowName 
}: WorkflowExecutionPanelProps) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionId, setExecutionId] = useState<string | null>(null);
  const [inputData, setInputData] = useState<string>('{\n  "input": "Your input data here"\n}');
  const [executionHistory, setExecutionHistory] = useState<any[]>([]);

  const executeWorkflow = api.promptChains.execute.useMutation({
    onSuccess: (data) => {
      setExecutionId(data.executionId);
      setIsExecuting(true);
    },
    onError: (error) => {
      console.error('Execution failed:', error);
      alert(`Execution failed: ${error.message}`);
    },
  });

  const handleExecute = () => {
    try {
      const parsedInput = JSON.parse(inputData);
      executeWorkflow.mutate({
        chainId: workflowId,
        input: parsedInput,
      });
    } catch (error) {
      alert('Invalid JSON input. Please check your input data.');
    }
  };

  const handleExecutionComplete = (result: any) => {
    setIsExecuting(false);
    setExecutionHistory(prev => [{
      executionId,
      timestamp: new Date().toISOString(),
      status: 'completed',
      output: result,
    }, ...prev].slice(0, 5)); // Keep last 5 executions
  };

  const handleExecutionError = (error: string) => {
    setIsExecuting(false);
    setExecutionHistory(prev => [{
      executionId,
      timestamp: new Date().toISOString(),
      status: 'failed',
      error,
    }, ...prev].slice(0, 5));
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-semibold mb-4">Execute Workflow: {workflowName}</h2>
      
      {/* Input Section */}
      <div className="mb-6">
        <label htmlFor="input-data" className="block text-sm font-medium text-gray-700 mb-2">
          Input Data (JSON)
        </label>
        <textarea
          id="input-data"
          value={inputData}
          onChange={(e) => setInputData(e.target.value)}
          className="w-full h-32 p-3 border border-gray-300 rounded-md font-mono text-sm focus:ring-blue-500 focus:border-blue-500"
          placeholder='{"input": "Your data here"}'
        />
      </div>

      {/* Execute Button */}
      <button
        onClick={handleExecute}
        disabled={isExecuting || executeWorkflow.isLoading}
        className={`w-full py-2 px-4 rounded-md font-medium transition-colors ${
          isExecuting || executeWorkflow.isLoading
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
      >
        {isExecuting ? 'Executing...' : 'Execute Workflow'}
      </button>

      {/* Execution Status */}
      {executionId && isExecuting && (
        <div className="mt-6">
          <ExecutionStatus
            executionId={executionId}
            onComplete={handleExecutionComplete}
            onError={handleExecutionError}
          />
        </div>
      )}

      {/* Execution History */}
      {executionHistory.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-3">Recent Executions</h3>
          <div className="space-y-2">
            {executionHistory.map((execution, index) => (
              <div
                key={execution.executionId || index}
                className={`p-3 rounded-md border ${
                  execution.status === 'completed'
                    ? 'border-green-200 bg-green-50'
                    : 'border-red-200 bg-red-50'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium">
                      {new Date(execution.timestamp).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      ID: {execution.executionId?.slice(0, 8)}...
                    </p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded ${
                    execution.status === 'completed'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {execution.status}
                  </span>
                </div>
                {execution.output && (
                  <details className="mt-2">
                    <summary className="text-xs text-gray-600 cursor-pointer">
                      View Output
                    </summary>
                    <pre className="mt-2 text-xs bg-white p-2 rounded overflow-x-auto">
                      {JSON.stringify(execution.output, null, 2)}
                    </pre>
                  </details>
                )}
                {execution.error && (
                  <p className="mt-2 text-xs text-red-600">{execution.error}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}