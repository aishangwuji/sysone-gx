import React, { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { BatchNodeData } from "../../../types/workflow";
import { useWorkflowStore } from "../../../store/useWorkflowStore";
import { Layers, ShieldAlert, CheckCircle2 } from "lucide-react";

export const BatchNode = memo(({ id, data }: NodeProps) => {
  const bData = data as unknown as BatchNodeData;
  const { selectNode, selectedNodeId, selectedQuestionId, t } = useWorkflowStore();
  const isCurrentSelected = selectedNodeId === id;
  const simResult = bData.simulationResult;

  return (
    <div
      onClick={() => selectNode(id)}
      className={"rounded-xl border shadow-2xl transition-all duration-200 min-w-[340px] max-w-[400px] overflow-hidden " + (isCurrentSelected ? "border-primary shadow-primary/20 ring-2 ring-primary/40 bg-[#151822]" : "border-[#282D3D] hover:border-[#3E455B] bg-[#12141C]")}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-primary !border-2 !border-[#12141C] -ml-1.5"
      />

      <div className="p-3.5 bg-gradient-to-r from-[#1A1E2B] to-[#141620] border-b border-[#282D3D] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm text-gray-100">{bData.title || t.canvas.defaultBatchTitle}</h3>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-[#222736] text-primary border border-primary/30">
                {bData.model || "jev-latest"}
              </span>
            </div>
            <p className="text-[11px] text-gray-400 truncate max-w-[240px]">
              {bData.description || t.canvas.defaultBatchDesc}
            </p>
          </div>
        </div>
        {simResult?.status === "passed" && (
          <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2 py-0.5 rounded-full">
            <CheckCircle2 className="w-3 h-3" />
            {simResult.executionTimeMs}ms
          </span>
        )}
      </div>

      <div className="p-3 space-y-2.5 bg-[#0F1118]">
        {bData.questions.map((q) => {
          const isQSelected = isCurrentSelected && selectedQuestionId === q.id;
          const qAns = simResult?.answers?.[q.id];

          return (
            <div
              key={q.id}
              onClick={(e) => {
                e.stopPropagation();
                selectNode(id, q.id);
              }}
              className={"p-2.5 rounded-lg border text-left transition-colors cursor-pointer relative " + (isQSelected ? "border-primary/60 bg-[#1A1D2A]" : "border-[#232736] hover:border-[#32394D] bg-[#141722]")}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span
                    className={"text-[9px] font-mono uppercase px-1.5 py-0.5 rounded font-bold " + (q.type === "choice" ? "bg-purple-500/20 text-purple-300 border border-purple-500/30" : q.type === "score" ? "bg-blue-500/20 text-blue-300 border border-blue-500/30" : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30")}
                  >
                    {q.type}
                  </span>
                  <span className="text-xs font-mono font-semibold text-gray-300">{q.id}</span>
                </div>

                {qAns && (
                  <div className="flex items-center gap-1.5 text-[11px]">
                    {qAns.confidence !== undefined && (
                      <span className="text-[10px] text-amber-400 font-mono bg-amber-950/40 px-1 rounded">
                        conf: {qAns.confidence.toFixed(2)}
                      </span>
                    )}
                    <span className="font-bold text-primary font-mono">
                      {q.type === "choice"
                        ? qAns.choice
                        : q.type === "score"
                        ? qAns.score?.toFixed(2)
                        : (qAns.noul !== undefined ? `${(qAns.noul * 100).toFixed(0)}%` : '')}
                    </span>
                  </div>
                )}
              </div>

              <div className="text-[11px] text-gray-400 line-clamp-1 mb-2">
                {typeof q.instructions === "string" ? q.instructions : JSON.stringify(q.instructions)}
              </div>

              {q.type === "choice" && (
                <div className="space-y-1 mt-1 border-t border-[#232736] pt-1.5">
                  {Object.keys(q.criteria).map((opt) => {
                    const prob = qAns?.probabilities?.[opt];
                    const isWinning = qAns?.choice === opt;
                    return (
                      <div
                        key={opt}
                        className="flex items-center justify-between text-[11px] py-0.5 px-1.5 rounded relative group hover:bg-[#202535]"
                      >
                        <span className={"font-mono " + (isWinning ? "text-primary font-bold" : "text-gray-300")}>
                          {opt}
                        </span>
                        {prob !== undefined && (
                          <div className="flex items-center gap-1.5">
                            <div className="w-12 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                              <div
                                className={"h-full " + (isWinning ? "bg-primary" : "bg-gray-500")}
                                style={{ width: `${prob * 100}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-mono text-gray-400 w-7 text-right">
                              {(prob * 100).toFixed(0)}%
                            </span>
                          </div>
                        )}
                        <Handle
                          type="source"
                          position={Position.Right}
                          id={"q_" + q.id + "_" + opt}
                          className="!w-2.5 !h-2.5 !bg-primary !border-2 !border-[#12141C] -mr-3"
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              {q.type === "score" && (
                <div className="space-y-1 mt-1 border-t border-[#232736] pt-1.5">
                  {q.criteria.map((level, lIdx) => (
                    <div
                      key={lIdx}
                      className="flex items-center justify-between text-[11px] py-0.5 px-1.5 rounded relative group hover:bg-[#202535]"
                    >
                      <span className="text-gray-300 truncate max-w-[200px]">
                        <strong className="text-blue-400 font-mono">{lIdx}: </strong>
                        {typeof level === "string" ? level : level.what || "Level " + lIdx}
                      </span>
                      <Handle
                        type="source"
                        position={Position.Right}
                        id={"q_" + q.id + "_" + lIdx}
                        className="!w-2.5 !h-2.5 !bg-blue-400 !border-2 !border-[#12141C] -mr-3"
                      />
                    </div>
                  ))}
                </div>
              )}

              {q.type === "noul" && (
                <div className="flex items-center justify-between mt-1.5 border-t border-[#232736] pt-1 px-1">
                  <div className="relative flex items-center gap-1">
                    <span className="text-[11px] text-emerald-400 font-semibold">{t.canvas.yesThreshold}</span>
                    <Handle
                      type="source"
                      position={Position.Right}
                      id={"q_" + q.id + "_yes"}
                      className="!w-2.5 !h-2.5 !bg-emerald-400 !border-2 !border-[#12141C] -mr-3"
                    />
                  </div>
                  <div className="relative flex items-center gap-1">
                    <span className="text-[11px] text-rose-400 font-semibold">{t.canvas.noThreshold}</span>
                    <Handle
                      type="source"
                      position={Position.Right}
                      id={"q_" + q.id + "_no"}
                      className="!w-2.5 !h-2.5 !bg-rose-400 !border-2 !border-[#12141C] -mr-3"
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {bData.enableConfidenceFallback && (
        <div className="p-2 bg-[#17131F] border-t border-amber-500/20 flex items-center justify-between text-[11px] relative">
          <div className="flex items-center gap-1.5 text-amber-400 font-medium">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>
              {(() => {
                const range = bData.confidenceRange ?? [0.30, bData.confidenceThreshold ?? 0.70];
                return t.canvas.fallbackHandle
                  .replace("{min}", range[0].toFixed(2))
                  .replace("{max}", range[1].toFixed(2))
                  .replace("{val}", range[1].toFixed(2));
              })()}
            </span>
          </div>
          <Handle
            type="source"
            position={Position.Right}
            id="fallback_handle"
            className="!w-3 !h-3 !bg-amber-400 !border-2 !border-[#12141C] -mr-1.5"
          />
        </div>
      )}
    </div>
  );
});

BatchNode.displayName = "BatchNode";
