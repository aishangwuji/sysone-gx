import React, { useState } from "react";
import { useWorkflowStore } from "../store/useWorkflowStore";
import { useAuthStore } from "../store/useAuthStore";
import {
  Sparkles,
  Layers,
  ArrowRightCircle,
  Code2,
  Globe,
  FolderKanban,
  Save,
  User as UserIcon,
  LogOut,
  ChevronDown,
  Loader2,
  Check
} from "lucide-react";
import { CodeExportModal } from "./Modals/CodeExportModal";

export function Header() {
  const {
    currentProjectName,
    openProjectManager,
    saveCurrentProject,
    isSaving,
    addBatchNode,
    addActionNode,
    language,
    setLanguage,
    t
  } = useWorkflowStore();

  const {
    user,
    isAuthenticated,
    openAuthModal,
    logout
  } = useAuthStore();

  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = async () => {
    if (!isAuthenticated) {
      openAuthModal('login');
      return;
    }
    try {
      await saveCurrentProject();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err: any) {
      alert(err.message || '保存失败');
    }
  };

  return (
    <header className="h-14 bg-[#121520] border-b border-[#282D3D] px-5 flex items-center justify-between z-10 select-none">
      {/* Left: Brand & Project Selector */}
      <div className="flex items-center gap-4">
        {/* Logo & Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg shadow-primary/30">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-sm tracking-tight text-white">{t.app.title}</h1>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-primary/20 text-primary border border-primary/30">
                {t.app.badge}
              </span>
            </div>
          </div>
        </div>

        <div className="h-5 w-px bg-[#282D3D]" />

        {/* Project Selector & Quick Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={openProjectManager}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#151822] hover:bg-[#1A1F2C] border border-[#282D3D] text-gray-200 transition-colors group"
            title={t.project.myProjects}
          >
            <FolderKanban className="w-3.5 h-3.5 text-primary group-hover:scale-110 transition-transform" />
            <span className="text-xs font-semibold max-w-[180px] truncate">
              {currentProjectName || '未命名决策流'}
            </span>
            <ChevronDown className="w-3 h-3 text-gray-500" />
          </button>

          {/* Quick Save Button */}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              saveSuccess
                ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-400'
                : 'bg-[#151822] hover:bg-[#1C212F] border-[#282D3D] text-gray-300'
            }`}
            title="保存工作流至当前项目"
          >
            {isSaving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
            ) : saveSuccess ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Save className="w-3.5 h-3.5 text-gray-400" />
            )}
            <span>{isSaving ? t.project.saving : saveSuccess ? t.project.saved : t.project.saveBtn}</span>
          </button>
        </div>
      </div>

      {/* Right Actions & User Toolbar */}
      <div className="flex items-center gap-2.5">
        {/* Language Switcher */}
        <div className="flex items-center bg-[#0F1118] p-1 rounded-lg border border-[#282D3D]">
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

        {/* Node Addition Controls */}
        <div className="flex items-center gap-1.5 bg-[#0F1118] p-1 rounded-lg border border-[#282D3D]">
          <button
            onClick={addBatchNode}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-[#151822] text-primary hover:bg-primary/10 border border-primary/30 transition-colors"
          >
            <Layers className="w-3.5 h-3.5" />
            {t.header.addBatch}
          </button>
          <button
            onClick={addActionNode}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium bg-[#121927] text-sky-400 hover:bg-sky-500/10 border border-sky-500/30 transition-colors"
          >
            <ArrowRightCircle className="w-3.5 h-3.5" />
            {t.header.addAction}
          </button>
        </div>

        <div className="h-5 w-px bg-[#282D3D] mx-0.5" />

        {/* Code Export Button */}
        <button
          onClick={() => setIsExportOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#151822] hover:bg-[#1C212F] text-gray-200 border border-[#282D3D] text-xs font-semibold shadow-sm transition-colors"
        >
          <Code2 className="w-3.5 h-3.5 text-primary" />
          {t.header.exportCode}
        </button>

        <div className="h-5 w-px bg-[#282D3D] mx-0.5" />

        {/* User Account / Auth Section */}
        {isAuthenticated && user ? (
          <div className="relative">
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#151822] hover:bg-[#1C212F] border border-[#282D3D] transition-colors"
            >
              <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">
                {user.nickname ? user.nickname.charAt(0).toUpperCase() : user.username.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs font-medium text-gray-200 max-w-[100px] truncate">
                {user.nickname || user.username}
              </span>
              <ChevronDown className="w-3 h-3 text-gray-500" />
            </button>

            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-[#151822] border border-[#282D3D] rounded-xl shadow-2xl py-1 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-2 border-b border-[#282D3D]">
                  <p className="text-xs font-bold text-gray-200 truncate">{user.nickname || user.username}</p>
                  <p className="text-[10px] text-gray-500 truncate">{user.email}</p>
                </div>
                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    openProjectManager();
                  }}
                  className="w-full px-3 py-2 text-left text-xs text-gray-300 hover:bg-[#1F2433] hover:text-white flex items-center gap-2"
                >
                  <FolderKanban className="w-3.5 h-3.5 text-primary" />
                  {t.project.myProjects}
                </button>
                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    logout();
                  }}
                  className="w-full px-3 py-2 text-left text-xs text-rose-400 hover:bg-rose-950/30 flex items-center gap-2 border-t border-[#282D3D]"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  {t.auth.logout}
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={() => openAuthModal('login')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-bold shadow-md shadow-primary/20 transition-all"
          >
            <UserIcon className="w-3.5 h-3.5" />
            {t.auth.loginTab} / {t.auth.registerTab}
          </button>
        )}
      </div>

      <CodeExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
      />
    </header>
  );
}
