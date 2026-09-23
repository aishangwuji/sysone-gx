import React, { useState, useRef, useMemo } from 'react';
import { useWorkflowStore } from '../../store/useWorkflowStore';
import { parseAndConvertWorkflow } from '../../utils/workflowImporter';
import { X, Upload, Check, AlertTriangle, ArrowRightCircle } from 'lucide-react';
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
    }, 400);
  };

  const summary = parseResult?.summary;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-[#121520] border border-[#282D3D] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 bg-[#151821] border-b border-[#282D3D] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-gray-100">{t.importModal.title}</h3>
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleFileUpload}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#1C2130] hover:bg-[#252C40] border border-[#2B3145] text-gray-200 text-xs font-medium transition-colors"
            >
              <Upload className="w-3.5 h-3.5 text-primary" />
              <span>{t.importModal.uploadFileBtn}</span>
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white p-1 rounded transition-colors ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0B0D13]">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="粘贴 JSON 配置内容..."
            className="w-full h-72 font-mono text-xs p-3 rounded-lg bg-[#0F1118] border border-[#282D3D] text-gray-200 placeholder-gray-600 focus:outline-none focus:border-primary resize-y"
          />

          {summary && (
            <div className="p-2.5 rounded-lg bg-[#141824] border border-[#282D3D] flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="text-gray-400">格式:</span>
                <span className="font-semibold text-emerald-400 font-mono">{summary.formatLabel}</span>
              </div>
              <div className="text-gray-400 font-mono text-[11px] flex items-center gap-3">
                <span>节点: {summary.batchCount + summary.actionCount}</span>
                <span>连线: {summary.edgeCount}</span>
                <span>问询: {summary.questionCount}</span>
              </div>
            </div>
          )}

          {parseResult?.error && (
            <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-500/30 flex items-start gap-2 text-rose-300 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <div className="font-mono text-[11px] whitespace-pre-wrap">{parseResult.error}</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#151821] border-t border-[#282D3D] flex items-center justify-between">
          <button
            onClick={() => setInputText('')}
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
                  <span>已导入</span>
                </>
              ) : (
                <>
                  <ArrowRightCircle className="w-4 h-4" />
                  <span>{t.importModal.applyBtn}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
