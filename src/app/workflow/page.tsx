'use client';

import WorkflowDesigner from '@/components/workflow/WorkflowDesigner';
import WorkflowSidebar from '@/components/workflow/WorkflowSidebar';

export default function WorkflowPage() {
  return (
    <div className="flex h-screen bg-gray-50">
      <WorkflowSidebar />
      <main className="flex-1 p-4">
        <div className="bg-white rounded-lg shadow-sm h-full">
          <div className="p-4 border-b border-gray-200">
            <h1 className="text-2xl font-semibold text-gray-900">Workflow Designer</h1>
            <p className="text-sm text-gray-800 mt-1">
              Create and manage your AI prompt workflows
            </p>
          </div>
          <div className="h-[calc(100%-5rem)]">
            <WorkflowDesigner />
          </div>
        </div>
      </main>
    </div>
  );
}