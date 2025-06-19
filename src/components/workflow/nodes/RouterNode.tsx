import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';

interface RouterNodeData {
  label: string;
  conditions?: string[];
}

const RouterNode = ({ data, selected }: NodeProps<RouterNodeData>) => {
  return (
    <div
      className={`px-4 py-2 shadow-md rounded-md bg-white border-2 ${
        selected ? 'border-purple-500' : 'border-stone-400'
      }`}
    >
      <div className="flex">
        <div className="rounded-full w-12 h-12 flex justify-center items-center bg-purple-500">
          <svg
            className="w-6 h-6 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
            />
          </svg>
        </div>
        <div className="ml-2">
          <div className="text-lg font-bold">{data.label}</div>
          <div className="text-gray-500 text-sm">Route by conditions</div>
        </div>
      </div>

      <Handle
        type="target"
        position={Position.Top}
        className="w-16 !bg-teal-500"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="a"
        style={{ left: '25%' }}
        className="w-16 !bg-teal-500"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="b"
        style={{ left: '75%' }}
        className="w-16 !bg-teal-500"
      />
    </div>
  );
};

export default memo(RouterNode);