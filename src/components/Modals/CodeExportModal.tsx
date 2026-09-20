import React, { useState } from 'react';
import { useWorkflowStore } from '../../store/useWorkflowStore';
import { generatePythonCode, generateTypeScriptCode } from '../../utils/codeGenerator';
import { X, Copy, Check, Code2 } from 'lucide-react';
import clsx from 'clsx';

interface CodeExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CodeExportModal({ isOpen, onClose }: CodeExportModalProps) {
  const { nodes, edges, t } = useWorkflowStore();
  const [activeTab, setActiveTab] = useState<'python' | 'typescript' | 'json'>('python');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  let codeContent = '';
  if (activeTab === 'python') {
    codeContent = generatePythonCode(nodes, edges);
  } else if (activeTab === 'typescript') {
    codeContent = generateTypeScriptCode(nodes, edges);
  } else {
    codeContent = JSON.stringify({ nodes, edges }, null, 2);
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(codeContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-[#121520] border border-[#282D3D] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 bg-[#151821] border-b border-[#282D3D] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Code2 className="w-5 h-5 text-primary" />
            <div>
              <h3 className="text-sm font-bold text-gray-100">{t.exportModal.title}</h3>
              <p className="text-[11px] text-gray-400">{t.exportModal.subtitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="p-4 bg-[#0F1118] border-b border-[#282D3D] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('python')}
              className={clsx(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                activeTab === 'python'
                  ? 'bg-primary text-white font-bold'
                  : 'bg-[#151821] text-gray-400 hover:text-white'
              )}
            >
              {t.exportModal.tabPython}
            </button>
            <button
              onClick={() => setActiveTab('typescript')}
              className={clsx(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                activeTab === 'typescript'
                  ? 'bg-primary text-white font-bold'
                  : 'bg-[#151821] text-gray-400 hover:text-white'
              )}
            >
              {t.exportModal.tabTs}
            </button>
            <button
              onClick={() => setActiveTab('json')}
              className={clsx(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                activeTab === 'json'
                  ? 'bg-primary text-white font-bold'
                  : 'bg-[#151821] text-gray-400 hover:text-white'
              )}
            >
              {t.exportModal.tabJson}
            </button>
          </div>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#222735] text-gray-200 text-xs font-medium hover:bg-[#2A2D3D]"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? t.exportModal.copiedBtn : t.exportModal.copyBtn}
          </button>
        </div>

        {/* Code Viewer */}
        <div className="p-4 flex-1 overflow-y-auto bg-[#0B1219]">
          <pre className="font-mono text-[11px] line-height-1.7 text-gray-300 whitespace-pre-wrap">
            {codeContent}
          </pre>
        </div>
      </div>
    </div>
  );
}
