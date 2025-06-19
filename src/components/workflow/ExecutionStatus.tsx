'use client';

import React, { useEffect, useState } from 'react';
import { api } from '@/lib/trpc/client';

interface ExecutionStatusProps {
  executionId: string;
  onComplete?: (result: any) => void;
  onError?: (error: string) => void;
}

export default function ExecutionStatus({ 
  executionId, 
  onComplete, 
  onError 
}: ExecutionStatusProps) {
  const [status, setStatus] = useState<string>('pending');
  const [progress, setProgress] = useState<number>(0);
  const [output, setOutput] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Poll for execution status
  const { data, isLoading, error: queryError } = api.promptChains.getExecutionStatus.useQuery(
    { executionId },
    {
      refetchInterval: (data) => {
        // Stop polling if execution is complete or failed
        if (data?.status === 'completed' || data?.status === 'failed') {
          return false;
        }
        // Poll every second while running
        return 1000;
      },
      enabled: !!executionId,
    }
  );

  useEffect(() => {
    if (data) {
      setStatus(data.status);
      setOutput(data.output);
      setError(data.error || null);

      // Calculate progress based on status
      const progressMap: Record<string, number> = {
        pending: 20,
        running: 50,
        completed: 100,
        failed: 100,
      };
      setProgress(progressMap[data.status] || 0);

      // Trigger callbacks
      if (data.status === 'completed' && onComplete) {
        onComplete(data.output);
      }
      if (data.status === 'failed' && onError && data.error) {
        onError(data.error);
      }
    }
  }, [data, onComplete, onError]);

  const getStatusColor = () => {
    switch (status) {
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'running':
        return 'text-blue-600 bg-blue-100';
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'failed':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'pending':
        return (
          <svg className="animate-pulse w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'running':
        return (
          <svg className="animate-spin w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        );
      case 'completed':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'failed':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Execution Status</h3>
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor()}`}>
          {getStatusIcon()}
          <span className="capitalize">{status}</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-500 ${
              status === 'failed' ? 'bg-red-600' : 'bg-blue-600'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Execution Details */}
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Execution ID:</span>
          <span className="font-mono text-xs">{executionId.slice(0, 8)}...</span>
        </div>
        
        {data?.metrics?.startTime && (
          <div className="flex justify-between">
            <span className="text-gray-600">Started:</span>
            <span>{new Date(data.metrics.startTime).toLocaleTimeString()}</span>
          </div>
        )}

        {data?.metrics?.duration && (
          <div className="flex justify-between">
            <span className="text-gray-600">Duration:</span>
            <span>{(data.metrics.duration / 1000).toFixed(2)}s</span>
          </div>
        )}

        {data?.metrics?.tokensUsed && (
          <div className="flex justify-between">
            <span className="text-gray-600">Tokens Used:</span>
            <span>{data.metrics.tokensUsed}</span>
          </div>
        )}

        {data?.metrics?.cost && (
          <div className="flex justify-between">
            <span className="text-gray-600">Cost:</span>
            <span>${data.metrics.cost.toFixed(4)}</span>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Output Preview */}
      {output && status === 'completed' && (
        <div className="mt-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">Output:</h4>
          <div className="p-3 bg-gray-50 rounded-md">
            <pre className="text-xs overflow-x-auto">
              {JSON.stringify(output, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}