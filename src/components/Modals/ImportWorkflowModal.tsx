import React, { useState, useRef, useMemo } from 'react';
import { useWorkflowStore } from '../../store/useWorkflowStore';
import {
  parseAndConvertWorkflow,
  PRESET_SAMPLES,
} from '../../utils/workflowImporter';
import {
  X,
  Upload,
  Check,
  AlertTriangle,
  Sparkles,
  Layers,
  FileCode,
  ShieldAlert,
  ArrowRightCircle,
  HelpCircle,
} from 'lucide-react';
import clsx from 'clsx';

interface ImportWorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ImportWorkflowModal({ isOpen, onClose }: ImportWorkflowModalProps) {
  const { importWorkflowData, t } = useWorkflowStore();
  const [inputText, setInputText] = useState('');
  const [importSuccess, setImportSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 实时解析与计算预览结果
  const parseResult = useMemo(() => {
    if (!inputText.trim()) return null;
    return parseAndConvertWorkflow(inputText);
  }, [inputText]);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setInputText(content);
      }
    };
    reader.readAsText(file, 'utf-8');
    // 清空 input 使得再次选择相同文件也能触发
    e.target.value = '';
  };

  const handleApply = () => {
    if (!parseResult || !parseResult.success) return;

    importWorkflowData({
      nodes: parseResult.nodes,
      edges: parseResult.edges,
      stateInput: parseResult.stateInput,
    });

    setImportSuccess(true);
    setTimeout(() => {
      setImportSuccess(false);
      onClose();
    }, 600);
  };

  const loadPreset = (type: 'bbsGo' | 'jevPayload') => {
    if (type === 'bbsGo') {
      setInputText(PRESET_SAMPLES.bbsGo.json);
    } else if (type === 'jevPayload') {
      setInputText(PRESET_SAMPLES.jevPayload.json);
    }
  };

  const summary = parseResult?.summary;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-[#121520] border border-[#282D3D] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-[#151821] border-b border-[#282D3D] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-gray-100">{t.importModal.title}</h3>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800/40">
                  {t.importModal.badge}
                </span>
              </div>
              <p className="text-[11px] text-gray-400">{t.importModal.subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Toolbar & Presets */}
        <div className="px-4 py-2.5 bg-[#0F1118] border-b border-[#282D3D] flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-300">快速填入示例:</span>
            <button
              onClick={() => loadPreset('bbsGo')}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#181C28] hover:bg-[#222738] border border-[#2B3145] text-xs text-primary font-medium transition-colors"
              title="载入 bbs-go 生产级社区风控与垃圾过滤规则"
            >
              <Sparkles className="w-3 h-3" />
              bbs-go 社区风控规则
            </button>
            <button
              onClick={() => loadPreset('jevPayload')}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#181C28] hover:bg-[#222738] border border-[#2B3145] text-xs text-sky-400 font-medium transition-colors"
              title="载入 Jev System One 原生多问询 Payload"
            >
              <FileCode className="w-3 h-3" />
              Jev 原生问询 Payload
            </button>
          </div>

          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleFileUpload}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#1C2130] hover:bg-[#252C40] border border-[#2B3145] text-gray-200 text-xs font-medium transition-colors"
            >
              <Upload className="w-3.5 h-3.5 text-primary" />
              {t.importModal.uploadFileBtn}
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0B0D13]">
          {/* Format Identification & Status */}
          {summary ? (
            <div className="p-3 rounded-lg bg-[#141824] border border-[#282D3D] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-gray-300 font-medium">识别格式:</span>
                <span className="text-xs font-bold text-emerald-400 font-mono">
                  {summary.formatLabel}
                </span>
              </div>
              <span className="text-[11px] text-gray-400">
                就绪，导入后将自动生成图形化拓扑
              </span>
            </div>
          ) : parseResult?.error ? (
            <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/30 flex items-start gap-2 text-rose-300 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <div>
                <div className="font-bold text-rose-200">格式解析未通过</div>
                <div className="mt-0.5 font-mono text-[11px] whitespace-pre-wrap">{parseResult.error}</div>
              </div>
            </div>
          ) : (
            <div className="p-2.5 rounded-lg bg-[#131620] border border-[#232838] flex items-center gap-2 text-xs text-gray-400">
              <HelpCircle className="w-4 h-4 text-primary shrink-0" />
              <span>请直接粘贴 JSON 代码，或点击上方按钮上传配置文件。系统将自动探测并完成拓扑构建。</span>
            </div>
          )}

          {/* Text Area */}
          <div className="relative">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="在此粘贴包含 noulQuestions/scoreQuestions/choiceQuestions 的 bbs-go 规则、Jev 原生 Payload，或 SysOne GX 导出的工作流 JSON..."
              className="w-full h-56 font-mono text-xs p-3.5 rounded-lg bg-[#0F1118] border border-[#282D3D] text-gray-200 placeholder-gray-500 focus:outline-none focus:border-primary resize-y"
            />
          </div>

          {/* Visual Pre-check Summary Card (直观解析预览卡片) */}
          {summary && (
            <div className="p-3.5 rounded-xl bg-gradient-to-br from-[#131724] to-[#0E1018] border border-[#282E42] space-y-3">
              <div className="flex items-center justify-between border-b border-[#232738] pb-2">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold text-gray-200">图形化解析预览 (Visual Graph Preview)</span>
                </div>
                <span className="text-[10px] text-gray-400">
                  {summary.batchCount} 个评估批次 · {summary.actionCount} 个动作节点 · {summary.edgeCount} 条流转连线
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                <div className="p-2 rounded-lg bg-[#181C2A] border border-[#252B3D]">
                  <div className="text-[10px] text-gray-400">Choice 分类问询</div>
                  <div className="text-base font-bold text-purple-300 font-mono mt-0.5">
                    {summary.choiceCount} <span className="text-xs font-normal text-gray-400">项</span>
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-[#181C2A] border border-[#252B3D]">
                  <div className="text-[10px] text-gray-400">Score 阶梯评分</div>
                  <div className="text-base font-bold text-blue-300 font-mono mt-0.5">
                    {summary.scoreCount} <span className="text-xs font-normal text-gray-400">项</span>
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-[#181C2A] border border-[#252B3D]">
                  <div className="text-[10px] text-gray-400">Noul 概率校准</div>
                  <div className="text-base font-bold text-emerald-300 font-mono mt-0.5">
                    {summary.noulCount} <span className="text-xs font-normal text-gray-400">项</span>
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-[#181C2A] border border-[#252B3D]">
                  <div className="text-[10px] text-gray-400">决策分支连线</div>
                  <div className="text-base font-bold text-amber-300 font-mono mt-0.5">
                    {summary.edgeCount} <span className="text-xs font-normal text-gray-400">条</span>
                  </div>
                </div>
              </div>

              {summary.format === 'bbs-go' && (
                <div className="p-2.5 rounded-lg bg-[#151928] border border-amber-500/20 text-[11px] text-gray-300 space-y-1">
                  <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>自动识别的分流决策拓扑：</span>
                  </div>
                  <p className="text-gray-400 leading-relaxed">
                    已自动将违规分类与高危阈值对接至 <strong className="text-rose-400">违规直接拦截</strong> 节点；
                    存疑分类与低置信度模糊对接至 <strong className="text-amber-400">人工复核待审</strong> 节点；
                    合规档位对接至 <strong className="text-emerald-400">放行通过</strong> 节点。
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-[#151821] border-t border-[#282D3D] flex items-center justify-between">
          <button
            onClick={() => {
              setInputText('');
            }}
            disabled={!inputText}
            className="px-3 py-1.5 rounded-md text-xs font-medium text-gray-400 hover:text-white disabled:opacity-40 transition-colors"
          >
            {t.importModal.clearBtn}
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-md bg-[#202535] hover:bg-[#282E42] text-gray-300 text-xs font-medium transition-colors"
            >
              {t.importModal.cancelBtn}
            </button>

            <button
              onClick={handleApply}
              disabled={!parseResult || !parseResult.success}
              className={clsx(
                'flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-semibold shadow-md transition-all',
                importSuccess
                  ? 'bg-emerald-600 text-white'
                  : parseResult && parseResult.success
                  ? 'bg-primary hover:bg-primary/90 text-white cursor-pointer'
                  : 'bg-[#222736] text-gray-500 cursor-not-allowed border border-[#2B3145]'
              )}
            >
              {importSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  已成功载入画布！
                </>
              ) : (
                <>
                  <ArrowRightCircle className="w-4 h-4" />
                  {t.importModal.applyBtn}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
