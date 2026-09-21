import React from 'react';
import { useWorkflowStore } from '../../store/useWorkflowStore';
import { BatchNodeData, ActionNodeData, EntryType } from '../../types/workflow';
import { ShieldAlert, Trash2, Settings, Zap } from 'lucide-react';
import { DualRangeSlider } from '../common/DualRangeSlider';
import { resolveNativeModel, resolveOpenRouterModel } from '../../utils/modelMap';
import { DEFAULT_NOUL_YES, DEFAULT_NOUL_NO } from '../../utils/constants';

function parseSmartEntry(input: string, prevValue?: unknown): EntryType {
  const trimmed = input.trim();
  if (trimmed === 'null') return null;
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try {
      return JSON.parse(trimmed);
    } catch {
      // keep fallback
    }
  }
  if (prevValue && typeof prevValue === 'object' && !Array.isArray(prevValue)) {
    return { ...(prevValue as Record<string, any>), what: input };
  }
  return input;
}

function formatEntryForDisplay(val: unknown): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return val;
  if (val && typeof val === 'object' && !Array.isArray(val)) {
    const obj = val as Record<string, any>;
    if (obj.what && Object.keys(obj).length === 1) {
      return obj.what;
    }
  }
  return JSON.stringify(val);
}

export function NodeInspector() {
  const {
    nodes,
    edges,
    selectedNodeId,
    selectedQuestionId,
    selectNode,
    updateBatchNodeData,
    updateActionNodeData,
    addQuestionToBatch,
    updateQuestionInBatch,
    removeQuestionFromBatch,
    deleteNode,
    mergeDownstreamBatch,
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
  const selectedQ = bData.questions?.find((q) => q.id === selectedQuestionId) || bData.questions?.[0];

  const downstreamBatchNodes = nodes.filter(
    (n) => n.type === 'batchNode' && edges.some((e) => e.source === selectedNode.id && e.target === n.id)
  );

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
            <option value="typesafe/jev-1.13">{t.inspector.modelOpenRouter}</option>
          </select>
          <div className="flex items-center justify-between text-[10px] text-gray-500 mt-1 px-0.5">
            <span>原生通道: <strong className="font-mono text-gray-400">{resolveNativeModel(bData.model || 'jev-latest')}</strong></span>
            <span>OpenRouter: <strong className="font-mono text-gray-400">{resolveOpenRouterModel(bData.model || 'jev-latest')}</strong></span>
          </div>
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

        {downstreamBatchNodes.length > 0 && (
          <div className="p-3 rounded-lg bg-indigo-950/40 border border-indigo-500/30 space-y-2">
            <div className="flex items-center gap-1.5 text-indigo-300 text-xs font-semibold">
              <Zap className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{t.inspector.mergeDownstream}</span>
            </div>
            <p className="text-[11px] text-gray-300 leading-relaxed">
              {t.inspector.mergeDownstreamDesc}
            </p>
            <div className="space-y-1.5 pt-1">
              {downstreamBatchNodes.map((dn) => {
                const dnData = dn.data as unknown as BatchNodeData;
                return (
                  <button
                    key={dn.id}
                    type="button"
                    onClick={() => mergeDownstreamBatch(selectedNode.id, dn.id)}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-200 border border-indigo-500/40 rounded text-xs transition-colors"
                  >
                    <span className="truncate font-medium">
                      {t.inspector.mergeWithNode.replace('{title}', dnData?.title || dn.id)}
                    </span>
                    <span className="text-[10px] font-mono text-indigo-300 opacity-90 ml-2 shrink-0">
                      +{dnData?.questions?.length || 0} Q
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
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
                value={formatEntryForDisplay(selectedQ.instructions)}
                onChange={(e) => updateQuestionInBatch(selectedNode.id, selectedQ.id, {
                  instructions: parseSmartEntry(e.target.value, selectedQ.instructions)
                })}
                placeholder="支持输入描述文本或结构化 JSON 对象"
                className="w-full bg-[#151821] border border-[#282D3D] rounded px-2 py-1 text-xs text-gray-200 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-gray-400 mb-1">
                {t.inspector.criteriaConfig}
              </label>

              {selectedQ.type === 'choice' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-400">
                      选项数量: {Object.keys(selectedQ.criteria).length} / 255
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const optCount = Object.keys(selectedQ.criteria).length;
                        const optKey = optCount === 0 ? 'first_option' : 'option_' + (optCount + 1);
                        const newCriteria = { ...selectedQ.criteria, [optKey]: '选项定义描述 (what)' };
                        updateQuestionInBatch(selectedNode.id, selectedQ.id, { criteria: newCriteria });
                      }}
                      className="text-[11px] text-primary hover:text-primary/80 font-medium"
                    >
                      {t.inspector.addOption}
                    </button>
                  </div>

                  {Object.keys(selectedQ.criteria).length > 255 && (
                    <div className="text-[10px] text-rose-400 bg-rose-500/10 p-1.5 rounded border border-rose-500/30">
                      {t.inspector.choiceLimitWarning}
                    </div>
                  )}

                  {!Object.keys(selectedQ.criteria).some((k) => ['other', 'none', 'neither', 'unknown', 'fallback'].includes(k.toLowerCase())) && (
                    <div className="text-[10px] text-amber-400/80 bg-amber-500/10 p-1.5 rounded border border-amber-500/20">
                      {t.inspector.choiceFallbackTip}
                    </div>
                  )}

                  {Object.entries(selectedQ.criteria).map(([opt, desc], oidx) => (
                    <div key={opt + oidx} className="p-2 bg-[#151821] rounded border border-[#282D3D] space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono text-primary font-bold">{opt}</span>
                        {Object.keys(selectedQ.criteria).length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const newCriteria = { ...selectedQ.criteria };
                              delete newCriteria[opt];
                              updateQuestionInBatch(selectedNode.id, selectedQ.id, { criteria: newCriteria });
                            }}
                            className="text-gray-500 hover:text-rose-400 p-0.5"
                            title="删除选项"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        value={formatEntryForDisplay(desc)}
                        onChange={(e) => {
                          const parsed = parseSmartEntry(e.target.value, desc);
                          const newCriteria = { ...selectedQ.criteria, [opt]: parsed };
                          updateQuestionInBatch(selectedNode.id, selectedQ.id, { criteria: newCriteria });
                        }}
                        placeholder="支持输入描述或 JSON 对象 {what, not_for, examples}"
                        className="w-full bg-[#0F1118] border border-[#282D3D] rounded px-2 py-1 text-[11px] text-gray-300"
                      />
                    </div>
                  ))}
                </div>
              )}

              {selectedQ.type === 'score' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-400">
                      {t.inspector.scoreLimitHint.replace('{count}', String(selectedQ.criteria.length))}
                    </span>
                    {selectedQ.criteria.length < 10 && (
                      <button
                        type="button"
                        onClick={() => {
                          const nextIdx = selectedQ.criteria.length;
                          const newCriteria = [...selectedQ.criteria, { what: '第 ' + nextIdx + ' 档位定义' }];
                          updateQuestionInBatch(selectedNode.id, selectedQ.id, { criteria: newCriteria });
                        }}
                        className="text-[11px] text-blue-400 hover:text-blue-300 font-medium"
                      >
                        {t.inspector.addScoreLevel}
                      </button>
                    )}
                  </div>

                  <p className="text-[10px] text-gray-500">
                    {t.inspector.scoreLevelsDesc}
                  </p>

                  {selectedQ.criteria.map((lvl, lIdx) => (
                    <div key={lIdx} className="flex items-center gap-2">
                      <span className="text-xs font-mono text-blue-400 font-bold w-6 text-right">{lIdx}:</span>
                      <input
                        type="text"
                        value={formatEntryForDisplay(lvl)}
                        onChange={(e) => {
                          const parsed = parseSmartEntry(e.target.value, lvl);
                          const newCriteria = [...selectedQ.criteria];
                          newCriteria[lIdx] = parsed;
                          updateQuestionInBatch(selectedNode.id, selectedQ.id, { criteria: newCriteria });
                        }}
                        placeholder="分档定义文本或 JSON 对象 {summary, signals, what}"
                        className="flex-1 bg-[#151821] border border-[#282D3D] rounded px-2 py-1 text-[11px] text-gray-300"
                      />
                      {selectedQ.criteria.length > 2 && (
                        <button
                          type="button"
                          onClick={() => {
                            const newCriteria = selectedQ.criteria.filter((_, idx) => idx !== lIdx);
                            updateQuestionInBatch(selectedNode.id, selectedQ.id, { criteria: newCriteria });
                          }}
                          className="text-gray-500 hover:text-rose-400 p-1"
                          title="删除分档 (至少保留 2 档)"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {selectedQ.type === 'noul' && (
                <div className="space-y-2">
                  <p className="text-[10px] text-gray-500">
                    {t.inspector.noulDesc}
                  </p>

                  <div className="grid grid-cols-2 gap-2 bg-[#151821] p-2 rounded border border-[#282D3D]">
                    <div>
                      <span className="text-[10px] text-emerald-400 font-mono block mb-1">
                        {t.inspector.noulYesThresholdLabel}
                      </span>
                      <input
                        type="number"
                        min="0.5"
                        max="0.99"
                        step="0.05"
                        value={selectedQ.thresholds?.yes ?? DEFAULT_NOUL_YES}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          updateQuestionInBatch(selectedNode.id, selectedQ.id, {
                            thresholds: {
                              yes: isNaN(val) ? DEFAULT_NOUL_YES : val,
                              no: selectedQ.thresholds?.no ?? DEFAULT_NOUL_NO
                            }
                          });
                        }}
                        className="w-full bg-[#0F1118] border border-[#282D3D] rounded px-2 py-1 text-xs font-mono text-emerald-400"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-rose-400 font-mono block mb-1">
                        {t.inspector.noulNoThresholdLabel}
                      </span>
                      <input
                        type="number"
                        min="0.01"
                        max="0.5"
                        step="0.05"
                        value={selectedQ.thresholds?.no ?? DEFAULT_NOUL_NO}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          updateQuestionInBatch(selectedNode.id, selectedQ.id, {
                            thresholds: {
                              yes: selectedQ.thresholds?.yes ?? DEFAULT_NOUL_YES,
                              no: isNaN(val) ? DEFAULT_NOUL_NO : val
                            }
                          });
                        }}
                        className="w-full bg-[#0F1118] border border-[#282D3D] rounded px-2 py-1 text-xs font-mono text-rose-400"
                      />
                    </div>
                  </div>
                  <div>
                    <span className="text-xs font-mono text-emerald-400 font-bold">{t.inspector.criteriaTrue}</span>
                    <input
                      type="text"
                      value={formatEntryForDisplay(selectedQ.criteria?.true)}
                      onChange={(e) => {
                        const parsed = parseSmartEntry(e.target.value, selectedQ.criteria?.true);
                        const newCriteria = { ...selectedQ.criteria, true: parsed };
                        updateQuestionInBatch(selectedNode.id, selectedQ.id, { criteria: newCriteria });
                      }}
                      placeholder="判定为真 (Yes) 的标准描述或 JSON"
                      className="w-full bg-[#151821] border border-[#282D3D] rounded px-2 py-1 text-[11px] text-gray-300 mt-1"
                    />
                  </div>
                  <div>
                    <span className="text-xs font-mono text-rose-400 font-bold">{t.inspector.criteriaFalse}</span>
                    <input
                      type="text"
                      value={formatEntryForDisplay(selectedQ.criteria?.false)}
                      onChange={(e) => {
                        const parsed = parseSmartEntry(e.target.value, selectedQ.criteria?.false);
                        const newCriteria = { ...selectedQ.criteria, false: parsed };
                        updateQuestionInBatch(selectedNode.id, selectedQ.id, { criteria: newCriteria });
                      }}
                      placeholder="判定为假 (No) 的标准描述或 JSON"
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