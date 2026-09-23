import React from 'react';
import { useWorkflowStore } from '../../store/useWorkflowStore';
import { ShieldCheck, GitBranch, Trash2 } from 'lucide-react';
import { DualRangeSlider } from '../common/DualRangeSlider';

export function EdgeInspector() {
  const { edges, selectedEdgeId, updateEdgeData, selectEdge, setEdges } = useWorkflowStore();
  const currentEdge = edges.find((e) => e.id === selectedEdgeId);

  if (!currentEdge) return null;

  const edgeData = (currentEdge.data as any) || {};
  const gate = edgeData.confidenceGate || {
    enabled: false,
    operator: '>=',
    threshold: 0.85,
    range: [0.60, 0.85]
  };

  const handleGateChange = (partialGate: Partial<typeof gate>) => {
    updateEdgeData(currentEdge.id, {
      confidenceGate: {
        ...gate,
        ...partialGate
      }
    });
  };

  const deleteCurrentEdge = () => {
    setEdges(edges.filter((e) => e.id !== currentEdge.id));
    selectEdge(null);
  };

  return (
    <div className="p-4 space-y-5 h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#282D3D] pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-pink-500/10 border border-pink-500/30 text-pink-400">
            <GitBranch className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-200">连线规则配置</h3>
            <span className="text-[10px] font-mono text-gray-500">{currentEdge.id}</span>
          </div>
        </div>
        <button
          onClick={deleteCurrentEdge}
          className="text-rose-400 hover:text-rose-300 p-1 rounded"
          title="删除该连线"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Edge Label */}
      <div>
        <label className="block text-[11px] font-medium text-gray-400 mb-1">连线备注标签（可选）</label>
        <input
          type="text"
          value={edgeData.label || ''}
          onChange={(e) => updateEdgeData(currentEdge.id, { label: e.target.value })}
          placeholder="例如：直接放行 / 二次确认 / 转人工"
          className="w-full bg-[#0F1118] border border-[#282D3D] rounded-md px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-pink-500"
        />
      </div>

      {/* Confidence Gated Routing */}
      <div className="p-3.5 rounded-xl bg-[#14121F] border border-pink-500/30 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-pink-300 text-xs font-bold">
            <ShieldCheck className="w-4 h-4 text-pink-400" />
            <span>置信度门控 (Confidence Gate)</span>
          </div>
          <input
            type="checkbox"
            checked={Boolean(gate.enabled)}
            onChange={(e) => handleGateChange({ enabled: e.target.checked })}
            className="accent-pink-500 w-4 h-4 cursor-pointer"
          />
        </div>

        <p className="text-[11px] text-gray-400 leading-relaxed">
          TypeSafe 官方最佳实践：答案决定执行方向，置信度决定执行策略。只有当问询决策命中且模型置信度满足该门控条件时，才会激活此连线分流。
        </p>

        {gate.enabled && (
          <div className="space-y-3 pt-2 border-t border-pink-500/20">
            <div>
              <label className="block text-[11px] font-medium text-gray-300 mb-1.5">门控判断模式</label>
              <div className="grid grid-cols-3 gap-1.5 bg-[#0F1017] p-1 rounded-lg border border-[#232738]">
                <button
                  type="button"
                  onClick={() => handleGateChange({ operator: '>=' })}
                  className={`py-1 text-xs font-mono font-medium rounded transition-colors ${
                    gate.operator === '>='
                      ? 'bg-pink-600 text-white font-bold'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  &gt;= 高置信
                </button>
                <button
                  type="button"
                  onClick={() => handleGateChange({ operator: 'range' })}
                  className={`py-1 text-xs font-mono font-medium rounded transition-colors ${
                    gate.operator === 'range'
                      ? 'bg-pink-600 text-white font-bold'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  区间确认
                </button>
                <button
                  type="button"
                  onClick={() => handleGateChange({ operator: '<=' })}
                  className={`py-1 text-xs font-mono font-medium rounded transition-colors ${
                    gate.operator === '<='
                      ? 'bg-pink-600 text-white font-bold'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  &lt;= 疑虑兜底
                </button>
              </div>
            </div>

            {gate.operator === 'range' ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-gray-400">生效置信度区间：</span>
                  <span className="font-mono text-pink-400 font-bold">
                    {(gate.range?.[0] ?? 0.60).toFixed(2)} ~ {(gate.range?.[1] ?? 0.85).toFixed(2)}
                  </span>
                </div>
                <DualRangeSlider
                  min={0.0}
                  max={1.0}
                  step={0.05}
                  value={gate.range ?? [0.60, 0.85]}
                  onChange={([min, max]) => handleGateChange({ range: [min, max] })}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-gray-400">门控阈值：</span>
                  <span className="font-mono text-pink-400 font-bold">
                    {gate.operator} {(gate.threshold ?? 0.85).toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.10"
                  max="0.99"
                  step="0.05"
                  value={gate.threshold ?? 0.85}
                  onChange={(e) => handleGateChange({ threshold: parseFloat(e.target.value) })}
                  className="w-full accent-pink-500"
                />
                <div className="flex justify-between text-[10px] font-mono text-gray-500">
                  <span>0.10</span>
                  <span>0.50</span>
                  <span>0.85</span>
                  <span>0.99</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="p-3 rounded-lg bg-[#0F1118] border border-[#232738] text-[11px] text-gray-400 space-y-1">
        <div className="text-gray-300 font-semibold">连线节点端点</div>
        <div className="font-mono text-[10px] text-gray-500">
          Source: {currentEdge.source} ({currentEdge.sourceHandle || 'default'})
        </div>
        <div className="font-mono text-[10px] text-gray-500">
          Target: {currentEdge.target} ({currentEdge.targetHandle || 'default'})
        </div>
      </div>
    </div>
  );
}
