import React, { useState } from 'react';
import { EntryType } from '../../types/workflow';
import { Plus, X } from 'lucide-react';

interface StructuredCriteriaEditorProps {
  label: string;
  value: EntryType;
  onChange: (val: EntryType) => void;
  isScoreLevel?: boolean;
}

export function StructuredCriteriaEditor({
  label,
  value,
  onChange,
  isScoreLevel = false
}: StructuredCriteriaEditorProps) {
  const [newExample, setNewExample] = useState('');

  const isObject = value !== null && typeof value === 'object' && !Array.isArray(value);
  const obj = (isObject ? (value as Record<string, any>) : {}) || {};

  const mainText = isObject
    ? (obj.what || obj.summary || '')
    : (typeof value === 'string' ? value : '');
  const notForText = obj.not_for || '';
  const examplesList: string[] = Array.isArray(obj.examples)
    ? obj.examples
    : Array.isArray(obj.signals)
    ? obj.signals
    : [];

  const handleToggleMode = () => {
    if (!isObject) {
      // 纯文本升级为结构化对象
      onChange({
        what: typeof value === 'string' ? value : '',
        not_for: '',
        examples: []
      });
    } else {
      // 结构化对象降级为纯文本
      onChange(mainText || '');
    }
  };

  const handleMainTextChange = (txt: string) => {
    if (isObject) {
      if (isScoreLevel) {
        onChange({ ...obj, summary: txt, what: txt });
      } else {
        onChange({ ...obj, what: txt });
      }
    } else {
      onChange(txt);
    }
  };

  const handleNotForChange = (txt: string) => {
    onChange({ ...obj, not_for: txt });
  };

  const handleAddExample = () => {
    if (!newExample.trim()) return;
    const key = isScoreLevel ? 'signals' : 'examples';
    const updated = [...examplesList, newExample.trim()];
    onChange({ ...obj, [key]: updated });
    setNewExample('');
  };

  const handleRemoveExample = (idx: number) => {
    const key = isScoreLevel ? 'signals' : 'examples';
    const updated = examplesList.filter((_, i) => i !== idx);
    onChange({ ...obj, [key]: updated });
  };

  return (
    <div className="p-2 bg-[#121520] rounded-md border border-[#282D3D] space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono font-bold text-gray-200">{label}</span>
        <button
          type="button"
          onClick={handleToggleMode}
          className={`px-1.5 py-0.5 rounded text-[10px] font-mono border transition-colors ${
            isObject
              ? 'bg-purple-950/60 text-purple-300 border-purple-500/40'
              : 'bg-[#181C28] text-gray-400 border-[#2D3347] hover:text-gray-200'
          }`}
          title="切换纯文本描述或带 what/not_for/examples 的结构化对象"
        >
          {isObject ? '结构化 JSON' : '切换结构化'}
        </button>
      </div>

      {/* 主描述输入框 */}
      <div>
        <input
          type="text"
          value={mainText}
          onChange={(e) => handleMainTextChange(e.target.value)}
          placeholder={isObject ? (isScoreLevel ? '界定摘要 (summary/what)' : '适用情境描述 (what)') : '描述文本'}
          className="w-full bg-[#0E1017] border border-[#232738] rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-primary"
        />
      </div>

      {/* 结构化展开内容 */}
      {isObject && (
        <div className="pt-1.5 border-t border-[#232738] space-y-2">
          {!isScoreLevel && (
            <div>
              <label className="block text-[10px] text-gray-400 mb-0.5">混淆排除界定 (not_for)</label>
              <input
                type="text"
                value={notForText}
                onChange={(e) => handleNotForChange(e.target.value)}
                placeholder="明确指出不归属于此项的邻近混淆情境"
                className="w-full bg-[#0E1017] border border-[#232738] rounded px-2 py-1 text-[11px] text-amber-300/90 focus:outline-none"
              />
            </div>
          )}

          {/* Examples 样本列表 */}
          <div>
            <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
              <span>{isScoreLevel ? '典型特征信号 (signals)' : '典型正例样本 (examples)'}</span>
              <span className="font-mono text-gray-500">{examplesList.length} 条</span>
            </div>

            {/* 标签列表 */}
            {examplesList.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-1.5 max-h-24 overflow-y-auto">
                {examplesList.map((ex, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#1A1F2E] border border-[#2D354C] text-[10px] text-gray-300"
                  >
                    <span className="truncate max-w-[160px]" title={ex}>{ex}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveExample(idx)}
                      className="text-gray-500 hover:text-rose-400"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* 添加新样本输入框 */}
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={newExample}
                onChange={(e) => setNewExample(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddExample();
                  }
                }}
                placeholder="输入样本回车添加"
                className="flex-1 bg-[#0E1017] border border-[#232738] rounded px-2 py-0.5 text-[11px] text-gray-200 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddExample}
                className="px-1.5 py-0.5 rounded bg-primary/20 text-primary border border-primary/40 hover:bg-primary/30 text-[10px]"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
