import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { CompositeNodeData } from '../../../types/workflow';
import { useWorkflowStore } from '../../../store/useWorkflowStore';
import { Calculator, ArrowRight, Sliders, CheckCircle2 } from 'lucide-react';

interface CompositeNodeProps {
  id: string;
  data: CompositeNodeData;
  selected?: boolean;
}

export const CompositeNode = memo(({ id, data, selected }: CompositeNodeProps) => {
  const { selectNode, activeNodeIds } = useWorkflowStore();
  const isTraceActive = activeNodeIds.includes(id);

  const totalWeight = data.dimensions?.reduce((sum, d) => sum + (Number(d.weight) || 0), 0) || 0;
  const simResult = data.simulationResult;

  return (
    <div
      onClick={() => selectNode(id)}
      className={`w-72 rounded-xl bg-[#121520] border transition-all duration-200 select-none shadow-xl ${
        isTraceActive
          ? 'border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)] ring-2 ring-emerald-500/50'
          : selected
          ? 'border-pink-500 ring-2 ring-pink-500/30'
          : 'border-[#282D3D] hover:border-[#3E455E]'
      }`}
    >
      {/* Target Handle: 接收上游评估数据 */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className="!w-3 !h-3 !bg-pink-500 !border-2 !border-[#121520] -ml-1.5"
      />

      {/* Header */}
      <div className="p-3 bg-[#151824] border-b border-[#282D3D] rounded-t-xl flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-pink-500/10 border border-pink-500/30 text-pink-400">
            <Calculator className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-xs font-bold text-gray-100 flex items-center gap-1.5">
              <span>{data.title || '复合加权评分'}</span>
            </div>
            <div className="text-[10px] text-gray-400 font-mono">
              Composite Scoring (Jev Pattern)
            </div>
          </div>
        </div>

        {simResult?.compositeScore !== undefined && (
          <div className="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-mono font-bold text-xs">
            {simResult.compositeScore.toFixed(3)}
          </div>
        )}
      </div>

      {/* Dimensions List */}
      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between text-[10px] text-gray-400">
          <span className="flex items-center gap-1">
            <Sliders className="w-3 h-3 text-pink-400" />
            <span>评分维度与加权占比</span>
          </span>
          <span className={`font-mono ${Math.abs(totalWeight - 1.0) < 0.01 ? 'text-emerald-400' : 'text-amber-400'}`}>
            权重合计: {(totalWeight * 100).toFixed(0)}%
          </span>
        </div>

        {(!data.dimensions || data.dimensions.length === 0) ? (
          <div className="p-3 rounded-lg border border-dashed border-[#282D3D] bg-[#0E1017] text-center text-[11px] text-gray-500">
            请在右侧面板添加关联的 Score 问询维度
          </div>
        ) : (
          <div className="space-y-1.5">
            {data.dimensions.map((dim) => {
              const weightRatio = totalWeight > 0 ? (dim.weight / totalWeight) * 100 : 0;
              const normScore = simResult?.normalizedScores?.[dim.questionId];

              return (
                <div
                  key={dim.id || dim.questionId}
                  className="p-1.5 rounded-md bg-[#161A26] border border-[#232738] space-y-1"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-gray-200 font-medium truncate max-w-[140px]" title={dim.label || dim.questionId}>
                      {dim.label || dim.questionId}
                    </span>
                    <div className="flex items-center gap-1.5 font-mono text-[10px]">
                      {normScore !== undefined && (
                        <span className="text-pink-300 font-semibold">
                          归一: {normScore.toFixed(2)}
                        </span>
                      )}
                      <span className="text-gray-400">
                        {dim.weight} ({weightRatio.toFixed(0)}%)
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-pink-500 transition-all duration-300"
                      style={{ width: `${Math.min(100, Math.max(2, weightRatio))}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Output Branches */}
      <div className="border-t border-[#232738] p-2 bg-[#0E1017] rounded-b-xl space-y-1">
        <div className="text-[10px] text-gray-400 px-1 mb-1">分流出口规则</div>
        {data.branches?.map((branch) => {
          const isWinning = simResult?.activeBranchId === branch.id;
          return (
            <div
              key={branch.id}
              className={`flex items-center justify-between text-[11px] py-1 px-2 rounded-md relative group transition-colors ${
                isWinning ? 'bg-emerald-950/40 text-emerald-300 font-bold border border-emerald-500/30' : 'text-gray-300 hover:bg-[#161A26]'
              }`}
            >
              <div className="flex items-center gap-1 truncate max-w-[200px]">
                {isWinning ? <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" /> : <ArrowRight className="w-3 h-3 text-gray-500 shrink-0" />}
                <span className="truncate">{branch.label}</span>
              </div>
              <Handle
                type="source"
                position={Position.Right}
                id={branch.id}
                className={`!w-2.5 !h-2.5 !border-2 !border-[#121520] -mr-3 ${
                  isWinning ? '!bg-emerald-400' : '!bg-pink-500'
                }`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
});

CompositeNode.displayName = 'CompositeNode';
