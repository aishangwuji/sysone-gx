import React from 'react';
import { useWorkflowStore } from '../../store/useWorkflowStore';
import { BatchNodeData, ActionNodeData } from '../../types/workflow';
import { ShieldAlert, Trash2, Settings } from 'lucide-react';
import { DualRangeSlider } from '../common/DualRangeSlider';

export function NodeInspector() {
  const {
    nodes,
    selectedNodeId,
    selectedQuestionId,
    selectNode,
    updateBatchNodeData,
    updateActionNodeData,
    addQuestionToBatch,
    updateQuestionInBatch,
    removeQuestionFromBatch,
    deleteNode,
    t
  } = useWorkflowStore();

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  if (!selectedNode) {
    return (
      <div className="p-6 text-center text-gray-500">
        <Settings className="w-8 h-8 mx-auto mb-2 opacity-40" />
        <p className="text-xs">{t.inspector.emptyPrompt}</p>
      </div>
    );
  }

  if (selectedNode.type === 'actionNode') {
    const aData = selectedNode.data as unknown as ActionNodeData;
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between border-b border-[#282D3D] pb-3">
          <h3 className="text-sm font-bold text-gray-200">{t.inspector.actionConfig}</h3>
          <button
            onClick={() => deleteNode(selectedNode.id)}
            className="text-rose-400 hover:text-rose-300 p-1 rounded"
            title={t.inspector.deleteNode}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-gray-400 mb-1">{t.inspector.title}</label>
          <input
            type="text"
            value={aData.title}
            onChange={(e) => updateActionNodeData(selectedNode.id, { title: e.target.value })}
            className="w-full bg-[#0F1118] border border-[#282D3D] rounded-md px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-sky-500"
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-gray-400 mb-1">{t.inspector.actionType}</label>
          <select
            value={aData.actionType}
            onChange={(e) => updateActionNodeData(selectedNode.id, { actionType: e.target.value as any })}
            className="w-full bg-[#0F1118] border border-[#282D3D] rounded-md px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-sky-500"
          >
            <option value="webhook">{t.inspector.webhook}</option>
            <option value="human_review">{t.inspector.humanReview}</option>
            <option value="llm_escalation">{t.inspector.llmEscalation}</option>
            <option value="database_update">{t.inspector.databaseUpdate}</option>
            <option value="return_response">{t.inspector.returnResponse}</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-gray-400 mb-1">
            {aData.actionType === 'webhook' ? t.inspector.endpointUrl : aData.actionType === 'human_review' ? t.inspector.targetTeam : t.inspector.descConfig}
          </label>
          <textarea
            rows={3}
            value={aData.config.endpoint || aData.config.team || aData.config.prompt || aData.config.message || ''}
            onChange={(e) => updateActionNodeData(selectedNode.id, { config: { ...aData.config, endpoint: e.target.value, message: e.target.value } })}
            className="w-full bg-[#0F1118] border border-[#282D3D] rounded-md px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-sky-500"
          />
        </div>
      </div>
    );
  }

  const bData = selectedNode.data as unknown as BatchNodeData;
  const selectedQ = bData.questions.find((q) => q.id === selectedQuestionId) || bData.questions[0];

  return (
    <div className="p-4 space-y-5 overflow-y-auto h-full">
      <div className="space-y-3 border-b border-[#282D3D] pb-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-gray-200">{t.inspector.batchConfig}</h3>
          <button
            onClick={() => deleteNode(selectedNode.id)}
            className="text-rose-400 hover:text-rose-300 p-1 rounded"
            title={t.inspector.deleteBatch}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-gray-400 mb-1">{t.inspector.batchTitle}</label>
          <input
            type="text"
            value={bData.title}
            onChange={(e) => updateBatchNodeData(selectedNode.id, { title: e.target.value })}
            className="w-full bg-[#0F1118] border border-[#282D3D] rounded-md px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-primary"
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-gray-400 mb-1">{t.inspector.model}</label>
          <select
            value={bData.model}
            onChange={(e) => updateBatchNodeData(selectedNode.id, { model: e.target.value })}
            className="w-full bg-[#0F1118] border border-[#282D3D] rounded-md px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-primary"
          >
            <option value="jev-latest">{t.inspector.modelRecommended}</option>
            <option value="jev-1.13.0">{t.inspector.modelStable}</option>
          </select>
        </div>

        <div className="p-3 rounded-lg bg-[#17131F] border border-amber-500/20 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-amber-400 text-xs font-semibold">
              <ShieldAlert className="w-4 h-4" />
              <span>{t.inspector.confidenceFallback}</span>
            </div>
            <input
              type="checkbox"
              checked={bData.enableConfidenceFallback}
              onChange={(e) => updateBatchNodeData(selectedNode.id, { enableConfidenceFallback: e.target.checked })}
              className="accent-amber-500 w-4 h-4"
            />
          </div>
          <p className="text-[11px] text-gray-400">
            {t.inspector.confidenceFallbackDesc}
          </p>
          {bData.enableConfidenceFallback && (
            <div className="mt-2 pt-2 border-t border-amber-500/20">
              <DualRangeSlider
                min={0.0}
                max={1.0}
                step={0.05}
                value={bData.confidenceRange ?? [0.30, bData.confidenceThreshold ?? 0.70]}
                onChange={([low, high]) => updateBatchNodeData(selectedNode.id, {
                  confidenceRange: [low, high],
                  confidenceThreshold: high
                })}
              />
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-bold text-gray-200">{t.inspector.parallelQuestions}</label>
          <div className="flex items-center gap-1">
            <button
              onClick={() => addQuestionToBatch(selectedNode.id, 'choice')}
              className="px-2 py-0.5 rounded text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/40"
            >
              + Choice
            </button>
            <button
              onClick={() => addQuestionToBatch(selectedNode.id, 'score')}
              className="px-2 py-0.5 rounded text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 hover:bg-blue-500/40"
            >
              + Score
            </button>
            <button
              onClick={() => addQuestionToBatch(selectedNode.id, 'noul')}
              className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/40"
            >
              + Noul
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {bData.questions.map((q) => (
            <button
              key={q.id}
              onClick={() => selectNode(selectedNode.id, q.id)}
              className={`px-2.5 py-1 rounded-md text-xs font-mono transition-colors ${
                selectedQ?.id === q.id
                  ? 'bg-primary text-white font-bold'
                  : 'bg-[#151821] text-gray-400 hover:bg-[#1C202C]'
              }`}
            >
              {q.id}
            </button>
          ))}
        </div>

        {selectedQ && (
          <div className="p-3 rounded-lg bg-[#0F1118] border border-[#282D3D] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-primary font-semibold">
                {t.inspector.entryType} <strong className="uppercase">{selectedQ.type}</strong>
              </span>
              {bData.questions.length > 1 && (
                <button
                  onClick={() => removeQuestionFromBatch(selectedNode.id, selectedQ.id)}
                  className="text-rose-400 hover:text-rose-300 text-[11px] flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>{t.inspector.remove}</span>
                </button>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-medium text-gray-400 mb-1">{t.inspector.questionId}</label>
              <input
                type="text"
                value={selectedQ.id}
                onChange={(e) => updateQuestionInBatch(selectedNode.id, selectedQ.id, { id: e.target.value })}
                className="w-full bg-[#151821] border border-[#282D3D] rounded px-2 py-1 text-xs font-mono text-gray-200 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-gray-400 mb-1">{t.inspector.instructions}</label>
              <textarea
                rows={2}
                value={typeof selectedQ.instructions === 'string' ? selectedQ.instructions : JSON.stringify(selectedQ.instructions)}
                onChange={(e) => updateQuestionInBatch(selectedNode.id, selectedQ.id, { instructions: e.target.value })}
                className="w-full bg-[#151821] border border-[#282D3D] rounded px-2 py-1 text-xs text-gray-200 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-gray-400 mb-1">
                {t.inspector.criteriaConfig}
              </label>
              {selectedQ.type === 'choice' && (
                <div className="space-y-2">
                  {Object.entries(selectedQ.criteria).map(([opt, desc], oidx) => (
                    <div key={opt + oidx} className="p-2 bg-[#151821] rounded border border-[#282D3D] space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono text-primary font-bold">{opt}</span>
                      </div>
                      <input
                        type="text"
                        value={typeof desc === 'string' ? desc : JSON.stringify(desc)}
                        onChange={(e) => {
                          const newCriteria = { ...selectedQ.criteria, [opt]: e.target.value };
                          updateQuestionInBatch(selectedNode.id, selectedQ.id, { criteria: newCriteria });
                        }}
                        className="w-full bg-[#0F1118] border border-[#282D3D] rounded px-2 py-1 text-[11px] text-gray-300"
                      />
                    </div>
                  ))}
                </div>
              )}

              {selectedQ.type === 'score' && (
                <div className="space-y-2">
                  {selectedQ.criteria.map((lvl, lIdx) => (
                    <div key={lIdx} className="flex items-center gap-2">
                      <span className="text-xs font-mono text-blue-400 font-bold w-4">{lIdx}:</span>
                      <input
                        type="text"
                        value={typeof lvl === 'string' ? lvl : JSON.stringify(lvl)}
                        onChange={(e) => {
                          const newCriteria = [...selectedQ.criteria];
                          newCriteria[lIdx] = e.target.value;
                          updateQuestionInBatch(selectedNode.id, selectedQ.id, { criteria: newCriteria });
                        }}
                        className="flex-1 bg-[#151821] border border-[#282D3D] rounded px-2 py-1 text-[11px] text-gray-300"
                      />
                    </div>
                  ))}
                </div>
              )}

              {selectedQ.type === 'noul' && (
                <div className="space-y-2">
                  <div>
                    <span className="text-xs font-mono text-emerald-400 font-bold">{t.inspector.criteriaTrue}</span>
                    <input
                      type="text"
                      value={(selectedQ.criteria?.true as string) || ''}
                      onChange={(e) => {
                        const newCriteria = { ...selectedQ.criteria, true: e.target.value };
                        updateQuestionInBatch(selectedNode.id, selectedQ.id, { criteria: newCriteria });
                      }}
                      className="w-full bg-[#151821] border border-[#282D3D] rounded px-2 py-1 text-[11px] text-gray-300 mt-1"
                    />
                  </div>
                  <div>
                    <span className="text-xs font-mono text-rose-400 font-bold">{t.inspector.criteriaFalse}</span>
                    <input
                      type="text"
                      value={(selectedQ.criteria?.false as string) || ''}
                      onChange={(e) => {
                        const newCriteria = { ...selectedQ.criteria, false: e.target.value };
                        updateQuestionInBatch(selectedNode.id, selectedQ.id, { criteria: newCriteria });
                      }}
                      className="w-full bg-[#151821] border border-[#282D3D] rounded px-2 py-1 text-[11px] text-gray-300 mt-1"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}