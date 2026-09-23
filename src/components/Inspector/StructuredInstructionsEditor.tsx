import React from 'react';
import { EntryType, StructuredInstructions } from '../../types/workflow';

interface StructuredInstructionsEditorProps {
  value: EntryType;
  onChange: (val: EntryType) => void;
}

export function StructuredInstructionsEditor({ value, onChange }: StructuredInstructionsEditorProps) {
  const isObject = value !== null && typeof value === 'object' && !Array.isArray(value);
  const obj = (isObject ? (value as StructuredInstructions) : {}) || {};

  const mainQuestion = isObject
    ? (obj.question || '')
    : (typeof value === 'string' ? value : '');
  const focusText = obj.focus || '';
  const fieldName = obj.field?.name || '';
  const fieldType = obj.field?.type || '';
  const fieldDesc = obj.field?.description || '';

  const handleToggleMode = () => {
    if (!isObject) {
      onChange({
        question: typeof value === 'string' ? value : '',
        focus: ''
      });
    } else {
      onChange(mainQuestion || '');
    }
  };

  const handleQuestionChange = (q: string) => {
    if (isObject) {
      onChange({ ...obj, question: q });
    } else {
      onChange(q);
    }
  };

  const handleFocusChange = (f: string) => {
    onChange({ ...obj, focus: f });
  };

  const handleFieldChange = (key: 'name' | 'type' | 'description', val: string) => {
    const currentField = obj.field || {};
    onChange({
      ...obj,
      field: {
        ...currentField,
        [key]: val
      }
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-[11px] font-medium text-gray-400">问询指令 (Instructions)</label>
        <button
          type="button"
          onClick={handleToggleMode}
          className={`px-1.5 py-0.5 rounded text-[10px] font-mono border transition-colors ${
            isObject
              ? 'bg-purple-950/60 text-purple-300 border-purple-500/40'
              : 'bg-[#151821] text-gray-400 border-[#282D3D] hover:text-gray-200'
          }`}
        >
          {isObject ? '结构化 Instructions' : '切换结构化'}
        </button>
      </div>

      <div>
        <textarea
          rows={2}
          value={mainQuestion}
          onChange={(e) => handleQuestionChange(e.target.value)}
          placeholder="问询主问题（支持反引号指定评估路径如 `ticket.messages[0].text`）"
          className="w-full bg-[#151821] border border-[#282D3D] rounded px-2 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-primary"
        />
      </div>

      {isObject && (
        <div className="p-2.5 rounded-lg bg-[#0E1017] border border-[#232738] space-y-2">
          <div>
            <label className="block text-[10px] text-gray-400 mb-0.5">评估聚焦/侧重点 (focus)</label>
            <input
              type="text"
              value={focusText}
              onChange={(e) => handleFocusChange(e.target.value)}
              placeholder="例如：Classify the information the customer wants"
              className="w-full bg-[#151821] border border-[#232738] rounded px-2 py-1 text-[11px] text-gray-300"
            />
          </div>

          <div className="pt-1.5 border-t border-[#232738] space-y-1.5">
            <span className="text-[10px] text-gray-400 font-semibold block">目标字段提取元信息 (field)</span>
            <div className="grid grid-cols-2 gap-1.5">
              <div>
                <input
                  type="text"
                  value={fieldName}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                  placeholder="字段名 (name)"
                  className="w-full bg-[#151821] border border-[#232738] rounded px-1.5 py-0.5 text-[10px] text-gray-300 font-mono"
                />
              </div>
              <div>
                <input
                  type="text"
                  value={fieldType}
                  onChange={(e) => handleFieldChange('type', e.target.value)}
                  placeholder="类型 (string/number)"
                  className="w-full bg-[#151821] border border-[#232738] rounded px-1.5 py-0.5 text-[10px] text-gray-300 font-mono"
                />
              </div>
            </div>
            <div>
              <input
                type="text"
                value={fieldDesc}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                placeholder="字段说明 (description)"
                className="w-full bg-[#151821] border border-[#232738] rounded px-1.5 py-0.5 text-[10px] text-gray-300"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
