import React from 'react';
import { useWorkflowStore } from '../../store/useWorkflowStore';
import { CompositeNodeData, CompositeDimension, BatchNodeData, ScoreQuestion } from '../../types/workflow';
import { Calculator, Plus, Trash2, Sliders, Info, Scale } from 'lucide-react';

interface CompositeInspectorProps {
  nodeId: string;
  data: CompositeNodeData;
}

export function CompositeInspector({ nodeId, data }: CompositeInspectorProps) {
  const { nodes, updateCompositeNodeData, deleteNode } = useWorkflowStore();

  // 探测当前画布中所有 BatchNode 里的 Score 问题
  const availableScoreQuestions: Array<{ batchTitle: string; question: ScoreQuestion }> = [];
  nodes.forEach((n) => {
    if (n.type === 'batchNode') {
      const bData = n.data as unknown as BatchNodeData;
      bData?.questions?.forEach((q) => {
        if (q.type === 'score') {
          availableScoreQuestions.push({
            batchTitle: bData.title || n.id,
            question: q as ScoreQuestion
          });
        }
      });
    }
  });

  const totalWeight = data.dimensions?.reduce((sum, d) => sum + (Number(d.weight) || 0), 0) || 0;

  const handleAddDimension = (qId: string, label: string, maxLvl: number) => {
    if (data.dimensions?.some((d) => d.questionId === qId)) return;
    const newDim: CompositeDimension = {
      id: 'dim_' + qId,
      questionId: qId,
      label: label || qId,
      weight: 0.5,
      maxLevel: maxLvl > 0 ? maxLvl : 2
    };
    updateCompositeNodeData(nodeId, {
      dimensions: [...(data.dimensions || []), newDim]
    });
  };

  const handleUpdateDimension = (dimId: string, partial: Partial<CompositeDimension>) => {
    const nextDims = (data.dimensions || []).map((d) => (d.id === dimId ? { ...d, ...partial } : d));
    updateCompositeNodeData(nodeId, { dimensions: nextDims });
  };

  const handleRemoveDimension = (dimId: string) => {
    updateCompositeNodeData(nodeId, {
      dimensions: (data.dimensions || []).filter((d) => d.id !== dimId)
    });
  };

  const handleNormalizeWeights = () => {
    if (!data.dimensions || data.dimensions.length === 0 || totalWeight === 0) return;
    const normalized = data.dimensions.map((d) => ({
      ...d,
      weight: parseFloat((d.weight / totalWeight).toFixed(2))
    }));
    updateCompositeNodeData(nodeId, { dimensions: normalized });
  };

  return (
    <div className="p-4 space-y-5 h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#282D3D] pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-pink-500/10 border border-pink-500/30 text-pink-400">
            <Calculator className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-200">复合加权评分算子</h3>
            <span className="text-[10px] font-mono text-gray-500">{nodeId}</span>
          </div>
        </div>
        <button
          onClick={() => deleteNode(nodeId)}
          className="text-rose-400 hover:text-rose-300 p-1 rounded"
          title="删除算子节点"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Basic Settings */}
      <div className="space-y-3">
        <div>
          <label className="block text-[11px] font-medium text-gray-400 mb-1">算子节点标题</label>
          <input
            type="text"
            value={data.title}
            onChange={(e) => updateCompositeNodeData(nodeId, { title: e.target.value })}
            className="w-full bg-[#0F1118] border border-[#282D3D] rounded-md px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-pink-500"
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-gray-400 mb-1">功能描述</label>
          <input
            type="text"
            value={data.description || ''}
            onChange={(e) => updateCompositeNodeData(nodeId, { description: e.target.value })}
            placeholder="例如：故障工单综合优先级评分"
            className="w-full bg-[#0F1118] border border-[#282D3D] rounded-md px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-pink-500"
          />
        </div>
      </div>

      {/* Formula Note */}
      <div className="p-3 rounded-lg bg-pink-950/20 border border-pink-500/30 text-[11px] text-pink-200 space-y-1">
        <div className="flex items-center gap-1.5 font-semibold text-pink-300">
          <Info className="w-3.5 h-3.5" />
          <span>TypeSafe 官方归一化加权计算模式</span>
        </div>
        <p className="text-gray-300 text-[10px] leading-relaxed">
          1. 维度归一化：每个 Score 结果除以其最高档位（<code>top_level = len(criteria) - 1</code>），映射到 0.0 ~ 1.0；<br />
          2. 综合评分：<code>composite = sum(weight × normalized)</code>，不受各题量表长度差异影响。
        </p>
      </div>

      {/* Dimensions Configuration */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-gray-200">
            <Sliders className="w-3.5 h-3.5 text-pink-400" />
            <span>评分维度管理</span>
          </div>
          {data.dimensions && data.dimensions.length > 0 && (
            <button
              type="button"
              onClick={handleNormalizeWeights}
              className="flex items-center gap-1 text-[10px] font-medium text-pink-400 hover:text-pink-300"
              title="自动将所有维度的权重按比例重算，使总和严格等于 1.0"
            >
              <Scale className="w-3 h-3" />
              <span>一键权重归一化</span>
            </button>
          )}
        </div>

        {/* Available Score Questions to Add */}
        {availableScoreQuestions.length > 0 && (
          <div className="p-2.5 rounded-lg bg-[#141724] border border-[#232738] space-y-2">
            <div className="text-[10px] text-gray-400">从画布已有的 Score 问询中快速添加：</div>
            <div className="flex flex-wrap gap-1.5">
              {availableScoreQuestions.map(({ batchTitle, question }) => {
                const isAdded = data.dimensions?.some((d) => d.questionId === question.id);
                return (
                  <button
                    key={question.id}
                    type="button"
                    disabled={isAdded}
                    onClick={() => handleAddDimension(question.id, question.id, Math.max(1, question.criteria.length - 1))}
                    className={`px-2 py-1 rounded text-[11px] font-mono flex items-center gap-1 border transition-colors ${
                      isAdded
                        ? 'bg-[#1C202C] text-gray-500 border-transparent cursor-not-allowed'
                        : 'bg-pink-600/20 text-pink-300 border-pink-500/40 hover:bg-pink-600/30'
                    }`}
                  >
                    <Plus className="w-3 h-3" />
                    <span>{question.id}</span>
                    <span className="text-[9px] text-gray-400">({batchTitle})</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Existing Dimensions */}
        <div className="space-y-2.5">
          {(!data.dimensions || data.dimensions.length === 0) ? (
            <div className="p-4 rounded-lg bg-[#0F1118] border border-dashed border-[#282D3D] text-center text-xs text-gray-500">
              暂未添加评分维度，请点击上方问询或手动添加
            </div>
          ) : (
            data.dimensions.map((dim) => (
              <div
                key={dim.id}
                className="p-3 rounded-lg bg-[#141724] border border-[#282D3D] space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-pink-400">{dim.questionId}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveDimension(dim.id)}
                    className="text-gray-500 hover:text-rose-400 p-0.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-gray-400 mb-0.5">维度名称</label>
                    <input
                      type="text"
                      value={dim.label}
                      onChange={(e) => handleUpdateDimension(dim.id, { label: e.target.value })}
                      className="w-full bg-[#0E1017] border border-[#232738] rounded px-2 py-1 text-xs text-gray-200"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-400 mb-0.5">最高档位 (分母)</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={dim.maxLevel}
                      onChange={(e) => handleUpdateDimension(dim.id, { maxLevel: parseInt(e.target.value, 10) || 1 })}
                      className="w-full bg-[#0E1017] border border-[#232738] rounded px-2 py-1 text-xs font-mono text-gray-200"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
                    <span>权重 (Weight)</span>
                    <span className="font-mono text-pink-300 font-bold">{dim.weight}</span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="1.0"
                    step="0.05"
                    value={dim.weight}
                    onChange={(e) => handleUpdateDimension(dim.id, { weight: parseFloat(e.target.value) })}
                    className="w-full accent-pink-500"
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Output Branches Management */}
      <div className="space-y-2.5 pt-3 border-t border-[#282D3D]">
        <label className="block text-xs font-bold text-gray-200">分流出口阈值规则</label>
        <div className="space-y-2">
          {data.branches?.map((branch, bIdx) => (
            <div key={branch.id} className="p-2.5 rounded-lg bg-[#141724] border border-[#232738] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-200">{branch.label}</span>
                <span className="text-[10px] font-mono text-pink-400">{branch.id}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-gray-400 mb-0.5">标签说明</label>
                  <input
                    type="text"
                    value={branch.label}
                    onChange={(e) => {
                      const next = [...(data.branches || [])];
                      next[bIdx] = { ...branch, label: e.target.value };
                      updateCompositeNodeData(nodeId, { branches: next });
                    }}
                    className="w-full bg-[#0E1017] border border-[#232738] rounded px-2 py-1 text-xs text-gray-200"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 mb-0.5">判定阈值</label>
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.05"
                    value={branch.value}
                    onChange={(e) => {
                      const next = [...(data.branches || [])];
                      next[bIdx] = { ...branch, value: parseFloat(e.target.value) || 0 };
                      updateCompositeNodeData(nodeId, { branches: next });
                    }}
                    className="w-full bg-[#0E1017] border border-[#232738] rounded px-2 py-1 text-xs font-mono text-pink-400"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
