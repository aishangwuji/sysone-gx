import React, { useState } from 'react';
import { useWorkflowStore } from '../../store/useWorkflowStore';
import {
  generatePythonCode,
  generateTypeScriptCode,
  generateOpenRouterCode,
  generateJevPayloadCode,
} from '../../utils/codeGenerator';
import { X, Copy, Check, Download, FileJson, FileCode, Code2 } from 'lucide-react';
import clsx from 'clsx';

interface CodeExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CodeExportModal({ isOpen, onClose }: CodeExportModalProps) {
  const { nodes, edges, t } = useWorkflowStore();
  const [activeTab, setActiveTab] = useState<'json' | 'payload' | 'python' | 'typescript' | 'openrouter'>('json');
  const [copied, setCopied] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  if (!isOpen) return null;

  let codeContent = '';
  if (activeTab === 'json') {
    codeContent = JSON.stringify({ nodes, edges }, null, 2);
  } else if (activeTab === 'payload') {
    codeContent = generateJevPayloadCode(nodes, edges);
  } else if (activeTab === 'python') {
    codeContent = generatePythonCode(nodes, edges);
  } else if (activeTab === 'openrouter') {
    codeContent = generateOpenRouterCode(nodes, edges);
  } else {
    codeContent = generateTypeScriptCode(nodes, edges);
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(codeContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    let filename = `sysone-gx-workflow-${Date.now()}.json`;
    let mimeType = 'application/json;charset=utf-8';

    if (activeTab === 'payload') {
      filename = `jev-system-one-payload-${Date.now()}.json`;
      mimeType = 'application/json;charset=utf-8';
    } else if (activeTab === 'python') {
      filename = `typesafe_workflow_${Date.now()}.py`;
      mimeType = 'text/x-python;charset=utf-8';
    } else if (activeTab === 'typescript') {
      filename = `typesafe_workflow_${Date.now()}.ts`;
      mimeType = 'text/typescript;charset=utf-8';
    } else if (activeTab === 'openrouter') {
      filename = `openrouter_decisions_${Date.now()}.ts`;
      mimeType = 'text/typescript;charset=utf-8';
    }

    const blob = new Blob([codeContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-[#121520] border border-[#282D3D] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="p-4 bg-[#151821] border-b border-[#282D3D] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-100">{t.exportModal.title}</h3>
              <p className="text-[11px] text-gray-400">{t.exportModal.subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs & Actions */}
        <div className="p-3 bg-[#0F1118] border-b border-[#282D3D] flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setActiveTab('json')}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                activeTab === 'json'
                  ? 'bg-primary text-white font-bold'
                  : 'bg-[#151821] text-gray-400 hover:text-white border border-[#282D3D]'
              )}
            >
              <FileJson className="w-3.5 h-3.5 text-amber-400" />
              {t.exportModal.tabJson}
            </button>
            <button
              onClick={() => setActiveTab('payload')}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                activeTab === 'payload'
                  ? 'bg-primary text-white font-bold'
                  : 'bg-[#151821] text-gray-400 hover:text-white border border-[#282D3D]'
              )}
            >
              <FileJson className="w-3.5 h-3.5 text-purple-400" />
              {t.exportModal.tabPayload}
            </button>
            <button
              onClick={() => setActiveTab('python')}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                activeTab === 'python'
                  ? 'bg-primary text-white font-bold'
                  : 'bg-[#151821] text-gray-400 hover:text-white border border-[#282D3D]'
              )}
            >
              <FileCode className="w-3.5 h-3.5 text-sky-400" />
              {t.exportModal.tabPython}
            </button>
            <button
              onClick={() => setActiveTab('typescript')}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                activeTab === 'typescript'
                  ? 'bg-primary text-white font-bold'
                  : 'bg-[#151821] text-gray-400 hover:text-white border border-[#282D3D]'
              )}
            >
              <FileCode className="w-3.5 h-3.5 text-blue-400" />
              {t.exportModal.tabTs}
            </button>
            <button
              onClick={() => setActiveTab('openrouter')}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                activeTab === 'openrouter'
                  ? 'bg-primary text-white font-bold'
                  : 'bg-[#151821] text-gray-400 hover:text-white border border-[#282D3D]'
              )}
            >
              <FileCode className="w-3.5 h-3.5 text-emerald-400" />
              {t.exportModal.tabOpenRouter}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#222735] text-gray-200 text-xs font-medium hover:bg-[#2A2D3D] transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? t.exportModal.copiedBtn : t.exportModal.copyBtn}
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary hover:bg-primary/90 text-white text-xs font-medium shadow-sm transition-colors"
            >
              {downloadSuccess ? <Check className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
              {downloadSuccess ? t.exportModal.downloadedBtn : t.exportModal.downloadBtn}
            </button>
          </div>
        </div>

        {/* Code Viewer */}
        <div className="p-4 flex-1 overflow-y-auto bg-[#0B1219]">
          <pre className="font-mono text-[11px] leading-relaxed text-gray-300 whitespace-pre-wrap select-all">
            {codeContent}
          </pre>
        </div>

        {/* Footer Hint */}
        <div className="p-3 bg-[#151821] border-t border-[#282D3D] flex items-center justify-between text-xs text-gray-400">
          <p className="truncate max-w-[85%]">
            {activeTab === 'json'
              ? '💡 导出的工作流 DSL 完整包含画布节点与拓扑连线，可直接用于在 SysOne GX 中随时“一键导入”无损还原。'
              : activeTab === 'payload'
              ? '💡 导出的 Jev 原生 Payload 对应 POST /v1/systemone 接口请求体，可直接作为 bbs-go 或外部服务的评测配置。'
              : activeTab === 'python'
              ? '💡 导出的 Python 代码基于 typesafe_sdk，可直接嵌入生产端后端服务执行推测并行问询。'
              : activeTab === 'typescript'
              ? '💡 导出的 TypeScript 包含标准 Fetch 调用逻辑与类型签名。'
              : '💡 导出的 OpenRouter 代码使用 typesafe/jev-1.13 模型接入 Decisions Alpha 接口。'}
          </p>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-[#222735] hover:bg-[#2A2D3D] text-gray-300 text-xs transition-colors shrink-0"
          >
            {t.exportModal.closeBtn || '关闭'}
          </button>
        </div>
      </div>
    </div>
  );
}
