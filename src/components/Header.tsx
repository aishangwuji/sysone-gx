import React, { useState } from "react";
import { useWorkflowStore } from "../store/useWorkflowStore";
import { Sparkles, Layers, ArrowRightCircle, Code2, Globe } from "lucide-react";
import { CodeExportModal } from "./Modals/CodeExportModal";

export function Header() {
  const { addBatchNode, addActionNode, language, setLanguage, t } = useWorkflowStore();
  const [isExportOpen, setIsExportOpen] = useState(false);

  return (
    <header className="h-14 bg-[#121520] border-b border-[#282D3D] px-5 flex items-center justify-between z-10">
      {/* Logo & Brand */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg shadow-primary/30">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-base tracking-tight text-white">{t.app.title}</h1>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-primary/20 text-primary border border-primary/30">
              {t.app.badge}
            </span>
          </div>
          <p className="text-[11px] text-gray-400">{t.app.subtitle}</p>
        </div>
      </div>

      {/* Actions & Toolbar */}
      <div className="flex items-center gap-2.5">
        {/* Language Switcher */}
        <div className="flex items-center gap-1 bg-[#0F1118] p-1 rounded-lg border border-[#282D3D]">
          <button
            onClick={() => setLanguage(language === "en" ? "zh" : "en")}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium text-gray-300 hover:text-white hover:bg-[#1C202C] transition-colors"
            title={t.header.switchLang}
          >
            <Globe className="w-3.5 h-3.5 text-primary" />
            <span className="font-mono text-[11px]">{language === "en" ? "EN / 中文" : "中文 / EN"}</span>
          </button>
        </div>

        <div className="h-5 w-px bg-[#282D3D] mx-0.5" />

        <div className="flex items-center gap-1.5 bg-[#0F1118] p-1 rounded-lg border border-[#282D3D]">
          <button
            onClick={addBatchNode}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-[#151822] text-primary hover:bg-primary/10 border border-primary/30"
          >
            <Layers className="w-3.5 h-3.5" />
            {t.header.addBatch}
          </button>
          <button
            onClick={addActionNode}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-[#121927] text-sky-400 hover:bg-sky-500/10 border border-sky-500/30"
          >
            <ArrowRightCircle className="w-3.5 h-3.5" />
            {t.header.addAction}
          </button>
        </div>

        <div className="h-5 w-px bg-[#282D3D] mx-0.5" />

        <button
          onClick={() => setIsExportOpen(true)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-bold shadow-lg shadow-primary/20"
        >
          <Code2 className="w-4 h-4" />
          {t.header.exportCode}
        </button>
      </div>

      <CodeExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
      />
    </header>
  );
}
