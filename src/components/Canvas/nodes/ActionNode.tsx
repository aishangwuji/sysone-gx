import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { ActionNodeData } from '../../../types/workflow';
import { useWorkflowStore } from '../../../store/useWorkflowStore';
import { Webhook, UserCheck, Bot, Database, ArrowRightCircle } from 'lucide-react';

const ACTION_ICONS: Record<string, any> = {
  webhook: Webhook,
  human_review: UserCheck,
  llm_escalation: Bot,
  database_update: Database,
  return_response: ArrowRightCircle
};

export const ActionNode = memo(({ id, data }: NodeProps) => {
  const aData = data as unknown as ActionNodeData;
  const { selectNode, selectedNodeId, t } = useWorkflowStore();
  const isSelected = selectedNodeId === id;
  const Icon = ACTION_ICONS[aData.actionType] || Webhook;

  return (
    <div
      onClick={() => selectNode(id)}
      className={`p-3.5 rounded-xl border shadow-xl transition-all duration-200 min-w-[260px] max-w-[320px] ${
        isSelected
          ? 'border-sky-500 shadow-sky-500/20 ring-2 ring-sky-500/40 bg-[#111927]'
          : 'border-[#282D3D] hover:border-[#3E455B] bg-[#121520]'
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-sky-400 !border-2 !border-[#12141C] -ml-1.5"
      />

      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20 shrink-0 mt-0.5">
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-gray-100 truncate">{aData.title || t.canvas.defaultActionTitle}</h4>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800/40 uppercase">
              {aData.actionType}
            </span>
          </div>

          <p className="text-[11px] text-gray-400 mt-1 line-clamp-2">
            {aData.config.endpoint || aData.config.team || aData.config.prompt || aData.config.message || t.canvas.customPayload}
          </p>

          {aData.simulationResult?.executed && (
            <div className="mt-2 pt-1.5 border-t border-sky-500/20 flex items-center justify-between text-[10px] text-emerald-400">
              <span className="font-medium">{t.canvas.executedInTrace}</span>
              <span className="font-mono">{aData.simulationResult.executedAt}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

ActionNode.displayName = 'ActionNode';
