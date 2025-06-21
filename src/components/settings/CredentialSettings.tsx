'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/trpc/client';
import { 
  KeyIcon, 
  CheckCircleIcon, 
  XCircleIcon, 
  TrashIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon 
} from '@heroicons/react/24/outline';

interface ServiceConfig {
  name: string;
  displayName: string;
  description: string;
  placeholder: string;
  icon: string;
}

const serviceConfigs: Record<string, ServiceConfig> = {
  openai: {
    name: 'openai',
    displayName: 'OpenAI',
    description: 'GPT-4, GPT-3.5, and DALL-E models',
    placeholder: 'sk-...',
    icon: '🤖'
  },
  anthropic: {
    name: 'anthropic',
    displayName: 'Anthropic',
    description: 'Claude 3 models (Opus, Sonnet, Haiku)',
    placeholder: 'sk-ant-...',
    icon: '🧠'
  },
  google: {
    name: 'google',
    displayName: 'Google AI',
    description: 'Gemini Pro and PaLM models',
    placeholder: 'AIza...',
    icon: '🌟'
  },
  gmail: {
    name: 'gmail',
    displayName: 'Gmail',
    description: 'Read and send emails',
    placeholder: 'OAuth token',
    icon: '📧'
  },
  slack: {
    name: 'slack',
    displayName: 'Slack',
    description: 'Send messages to Slack channels',
    placeholder: 'xoxb-...',
    icon: '💬'
  },
  twitter: {
    name: 'twitter',
    displayName: 'Twitter/X',
    description: 'Read mentions and post tweets',
    placeholder: 'Bearer token',
    icon: '🐦'
  },
  linkedin: {
    name: 'linkedin',
    displayName: 'LinkedIn',
    description: 'Post updates and read notifications',
    placeholder: 'OAuth token',
    icon: '💼'
  }
};

export default function CredentialSettings() {
  const router = useRouter();
  const [editingService, setEditingService] = useState<string | null>(null);
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({});

  // Fetch credential status
  const { data: credentialStatus, refetch: refetchStatus } = api.credentials.status.useQuery();
  
  // Mutations
  const storeCredential = api.credentials.store.useMutation({
    onSuccess: () => {
      refetchStatus();
      setEditingService(null);
      setApiKeys({});
    }
  });
  
  const deleteCredential = api.credentials.delete.useMutation({
    onSuccess: () => {
      refetchStatus();
    }
  });
  
  const testCredential = api.credentials.test.useMutation({
    onSuccess: (result, variables) => {
      setTestResults(prev => ({
        ...prev,
        [variables.service]: result
      }));
    }
  });

  const handleSave = async (service: string) => {
    const apiKey = apiKeys[service];
    if (!apiKey) return;

    await storeCredential.mutateAsync({
      service: service as any,
      apiKey
    });
  };

  const handleDelete = async (service: string) => {
    if (confirm(`Are you sure you want to delete your ${serviceConfigs[service].displayName} credentials?`)) {
      await deleteCredential.mutateAsync({
        service: service as any
      });
    }
  };

  const handleTest = async (service: string) => {
    await testCredential.mutateAsync({
      service: service as any
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <ShieldCheckIcon className="h-6 w-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">API Credentials</h2>
          </div>
          <button
            onClick={() => router.push('/designer')}
            className="px-4 py-2 text-sm font-medium text-gray-900 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Skip for now
          </button>
        </div>
        
        <p className="text-gray-800 mb-6">
          Securely store your API keys to enable AI models and integrations in your workflows.
          All credentials are encrypted before storage.
        </p>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-semibold mb-1">Security Notice</p>
              <p>Never share your API keys. They provide full access to your accounts and usage charges apply.</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {Object.entries(serviceConfigs).map(([service, config]) => {
            const isConfigured = credentialStatus?.[service] || false;
            const isEditing = editingService === service;
            const testResult = testResults[service];

            return (
              <div
                key={service}
                className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">{config.icon}</span>
                      <h3 className="text-lg font-semibold text-gray-900">{config.displayName}</h3>
                      {isConfigured && (
                        <CheckCircleIcon className="h-5 w-5 text-green-600" />
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-800 mb-3">{config.description}</p>

                    {isEditing ? (
                      <div className="space-y-3">
                        <input
                          type="password"
                          value={apiKeys[service] || ''}
                          onChange={(e) => setApiKeys(prev => ({ ...prev, [service]: e.target.value }))}
                          placeholder={config.placeholder}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        />
                        
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSave(service)}
                            disabled={!apiKeys[service] || storeCredential.isLoading}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                          >
                            {storeCredential.isLoading ? 'Saving...' : 'Save'}
                          </button>
                          
                          <button
                            onClick={() => {
                              setEditingService(null);
                              setApiKeys({});
                            }}
                            className="px-4 py-2 bg-gray-200 text-gray-900 rounded-md hover:bg-gray-300"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        {isConfigured ? (
                          <>
                            <button
                              onClick={() => setEditingService(service)}
                              className="px-3 py-1 text-sm bg-gray-100 text-gray-900 rounded-md hover:bg-gray-200"
                            >
                              Update
                            </button>
                            
                            <button
                              onClick={() => handleTest(service)}
                              disabled={testCredential.isLoading}
                              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
                            >
                              {testCredential.isLoading ? 'Testing...' : 'Test'}
                            </button>
                            
                            <button
                              onClick={() => handleDelete(service)}
                              disabled={deleteCredential.isLoading}
                              className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>

                            {testResult && (
                              <span className={`text-sm ml-2 ${testResult.success ? 'text-green-600' : 'text-red-600'}`}>
                                {testResult.message}
                              </span>
                            )}
                          </>
                        ) : (
                          <button
                            onClick={() => setEditingService(service)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                          >
                            Configure
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">Need API Keys?</h3>
        <ul className="space-y-1 text-sm text-blue-800">
          <li>• OpenAI: <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline">Get API Key</a></li>
          <li>• Anthropic: <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="underline">Get API Key</a></li>
          <li>• Google AI: <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="underline">Get API Key</a></li>
        </ul>
      </div>
    </div>
  );
}