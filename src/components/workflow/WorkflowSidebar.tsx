'use client';

import React from 'react';

const nodeTypes = [
  {
    type: 'prompt',
    label: 'Prompt',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
        />
      </svg>
    ),
    color: 'bg-blue-500',
  },
  {
    type: 'router',
    label: 'Router',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
        />
      </svg>
    ),
    color: 'bg-purple-500',
  },
  {
    type: 'validator',
    label: 'Validator',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    color: 'bg-green-500',
  },
  {
    type: 'integration',
    label: 'Integration',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
        />
      </svg>
    ),
    color: 'bg-orange-500',
  },
];

export default function WorkflowSidebar() {
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside className="bg-white border-r border-gray-200 p-4 w-64">
      <h3 className="text-lg font-semibold mb-4">Workflow Nodes</h3>
      <div className="space-y-2">
        {nodeTypes.map((node) => (
          <div
            key={node.type}
            className="flex items-center p-3 bg-gray-50 rounded-lg cursor-move hover:bg-gray-100 transition-colors"
            onDragStart={(event) => onDragStart(event, node.type)}
            draggable
          >
            <div className={`${node.color} p-2 rounded text-white mr-3`}>
              {node.icon}
            </div>
            <span className="font-medium">{node.label}</span>
          </div>
        ))}
      </div>
      
      <div className="mt-8">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Instructions</h4>
        <p className="text-sm text-gray-600">
          Drag and drop nodes onto the canvas to build your workflow. Connect nodes by dragging from one handle to another.
        </p>
      </div>
    </aside>
  );
}