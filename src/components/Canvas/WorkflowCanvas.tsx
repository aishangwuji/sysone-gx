import React, { useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  ConnectionMode,
  Edge
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useWorkflowStore } from '../../store/useWorkflowStore';
import { BatchNode } from './nodes/BatchNode';
import { ActionNode } from './nodes/ActionNode';
import { CompositeNode } from './nodes/CompositeNode';

const nodeTypes = {
  batchNode: BatchNode,
  actionNode: ActionNode,
  compositeNode: CompositeNode
};

export function WorkflowCanvas() {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    selectNode,
    selectedNodeId,
    selectEdge,
    selectedEdgeId,
    activeEdgeIds
  } = useWorkflowStore();

  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);

  const focusedNodeId = hoveredNodeId || selectedNodeId;
  const focusedEdgeId = hoveredEdgeId || selectedEdgeId;
  const hasFocus = Boolean(focusedNodeId || focusedEdgeId);
  const isTraceMode = activeEdgeIds.length > 0;

  const styledEdges = edges.map((edge: Edge) => {
    // 1. 沙盒决策执行追踪高亮
    if (isTraceMode) {
      const isTraceActive = activeEdgeIds.includes(edge.id);
      if (isTraceActive) {
        return {
          ...edge,
          animated: true,
          zIndex: 20,
          style: {
            ...edge.style,
            stroke: '#10B981',
            strokeWidth: 3,
            opacity: 1,
            filter: 'drop-shadow(0 0 8px #10B981)'
          }
        };
      }
      return {
        ...edge,
        animated: false,
        zIndex: 1,
        style: {
          ...edge.style,
          strokeWidth: 1,
          opacity: 0.08
        }
      };
    }

    // 2. 鼠标悬浮/选中聚焦高亮
    if (hasFocus) {
      const isConnected = focusedNodeId
        ? edge.source === focusedNodeId || edge.target === focusedNodeId
        : false;
      const isEdgeFocused = focusedEdgeId === edge.id;

      if (isConnected || isEdgeFocused) {
        const baseStroke = (edge.style?.stroke as string) || '#818CF8';
        return {
          ...edge,
          animated: true,
          zIndex: 15,
          style: {
            ...edge.style,
            stroke: baseStroke,
            strokeWidth: isEdgeFocused ? 3 : 2.5,
            opacity: 1,
            filter: `drop-shadow(0 0 6px ${baseStroke})`
          }
        };
      }

      // 非当前焦点的其它连线深度淡化
      return {
        ...edge,
        animated: false,
        zIndex: 1,
        style: {
          ...edge.style,
          strokeWidth: 1,
          opacity: 0.06
        }
      };
    }

    // 3. 默认静态半透明淡化（消除大面积密集连线的杂乱视觉）
    const baseStroke = (edge.style?.stroke as string) || '#64748B';
    const edgeData = edge.data as any;
    const gate = edgeData?.confidenceGate;
    let gateLabel = '';
    if (gate?.enabled) {
      if (gate.operator === 'range' && gate.range) {
        gateLabel = `conf: ${gate.range[0].toFixed(2)}~${gate.range[1].toFixed(2)}`;
      } else {
        gateLabel = `conf ${gate.operator || '>='} ${(gate.threshold ?? 0.85).toFixed(2)}`;
      }
    }
    const finalLabel = edgeData?.label ? `${edgeData.label} [${gateLabel}]` : gateLabel;

    return {
      ...edge,
      label: finalLabel || edge.label,
      labelStyle: { fill: '#F472B6', fontSize: 10, fontFamily: 'monospace', fontWeight: 600 },
      labelBgStyle: { fill: '#141724', fillOpacity: 0.9, stroke: '#DB2777', strokeWidth: 1, rx: 4, ry: 4 },
      labelBgPadding: [4, 2] as [number, number],
      animated: false,
      zIndex: 2,
      style: {
        ...edge.style,
        stroke: baseStroke,
        strokeWidth: 1.5,
        opacity: 0.3
      }
    };
  });

  return (
    <div className="w-full h-full relative bg-[#0B0D13]">
      <style>{`
        .react-flow__edge-path {
          transition: stroke-width 0.22s ease, opacity 0.22s ease, stroke 0.22s ease, filter 0.22s ease;
        }
      `}</style>

      <ReactFlow
        nodes={nodes}
        edges={styledEdges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        connectionMode={ConnectionMode.Loose}
        onNodeMouseEnter={(_, node) => setHoveredNodeId(node.id)}
        onNodeMouseLeave={() => setHoveredNodeId(null)}
        onEdgeMouseEnter={(_, edge) => setHoveredEdgeId(edge.id)}
        onEdgeMouseLeave={() => setHoveredEdgeId(null)}
        onEdgeClick={(_, edge) => selectEdge(edge.id)}
        onPaneClick={() => {
          selectNode(null);
          selectEdge(null);
        }}
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
          nodeColor={(node) => (node.type === 'batchNode' ? '#E551BA' : node.type === 'compositeNode' ? '#EC4899' : '#38BDF8')}
          maskColor="rgba(0, 0, 0, 0.7)"
          className="!bg-[#0F1118] !border !border-[#282D3D]"
        />
      </ReactFlow>
    </div>
  );
}
