import React from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  ConnectionMode
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useWorkflowStore } from '../../store/useWorkflowStore';
import { BatchNode } from './nodes/BatchNode';
import { ActionNode } from './nodes/ActionNode';

const nodeTypes = {
  batchNode: BatchNode,
  actionNode: ActionNode
};

export function WorkflowCanvas() {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    selectNode,
    activeEdgeIds
  } = useWorkflowStore();

  const styledEdges = edges.map((edge) => {
    const isActive = activeEdgeIds.includes(edge.id);
    if (isActive) {
      return {
        ...edge,
        animated: true,
        style: {
          ...edge.style,
          stroke: '#10B981',
          strokeWidth: 3,
          filter: 'drop-shadow(0 0 8px #10B981)'
        }
      };
    }
    return edge;
  });

  return (
    <div className="w-full h-full relative bg-[#0B0D13]">
      <ReactFlow
        nodes={nodes}
        edges={styledEdges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        connectionMode={ConnectionMode.Loose}
        onPaneClick={() => selectNode(null)}
        defaultEdgeOptions={{ type: 'smoothstep' }}
        fitView
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={16}
          size={1.5}
          color="#282D3D"
        />
        <Controls
          className="!bg-[#151821] !border !border-[#282D3D] !fill-gray-300"
        />
        <MiniMap
          nodeColor={(node) => (node.type === 'batchNode' ? '#E551BA' : '#38BDF8')}
          maskColor="rgba(0, 0, 0, 0.7)"
          className="!bg-[#0F1118] !border !border-[#282D3D]"
        />
      </ReactFlow>
    </div>
  );
}
