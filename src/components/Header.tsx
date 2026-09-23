import React, { useState } from "react";
import { useWorkflowStore } from "../store/useWorkflowStore";
import { useAuthStore } from "../store/useAuthStore";
import {
  Layers,
  ArrowRightCircle,
  Globe,
  FolderKanban,
  Save,
  User as UserIcon,
  LogOut,
  ChevronDown,
  Loader2,
  Check,
  Upload,
  Download
} from "lucide-react";
import { CodeExportModal } from "./Modals/CodeExportModal";
import { ImportWorkflowModal } from "./Modals/ImportWorkflowModal";

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
  const [isImportOpen, setIsImportOpen] = useState(false);
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
    <header className="h-12 bg-[#11141D] border-b border-[#232738] px-4 flex items-center justify-between z-10 select-none">
      {/* Left: Brand & Project Selector */}
      <div className="flex items-center gap-3">
        {/* Logo & Brand */}
        <div className="flex items-center gap-2.5">
          <img
            src="/logo.webp"
            alt="SysOne GX"
            className="w-7 h-7 rounded-md object-contain border border-[#2B3145]/60 bg-[#161924]/60 p-0.5"
          />
          <span className="font-bold text-sm tracking-tight text-white">{t.app.title}</span>
        </div>

        {/* Project Selector */}
        <button
          onClick={openProjectManager}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#161924] hover:bg-[#1E2333] border border-[#2B3145] text-gray-200 text-xs font-medium transition-colors"
          title={t.project.myProjects}
        >
          <FolderKanban className="w-3.5 h-3.5 text-primary" />
          <span className="max-w-[160px] truncate">
            {currentProjectName || '未命名决策流'}
          </span>
          <ChevronDown className="w-3 h-3 text-gray-400" />
        </button>

        {/* Quick Save */}
        <button
          onClick={handleSave}
          disabled={isSaving}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-all ${
            saveSuccess
              ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-400'
              : 'bg-[#161924] hover:bg-[#1E2333] border-[#2B3145] text-gray-300'
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

      {/* Right Actions & User Toolbar */}
      <div className="flex items-center gap-2">
        {/* Node Addition Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={addBatchNode}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-[#161924] text-primary hover:bg-primary/10 border border-primary/30 transition-colors"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{t.header.addBatch}</span>
          </button>
          <button
            onClick={addActionNode}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-[#161924] text-sky-400 hover:bg-sky-500/10 border border-sky-500/30 transition-colors"
          >
            <ArrowRightCircle className="w-3.5 h-3.5" />
            <span>{t.header.addAction}</span>
          </button>
        </div>

        {/* Import & Export Workflow Buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsImportOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-[#161924] hover:bg-[#1E2333] text-emerald-400 border border-emerald-500/30 transition-colors"
            title="导入"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>{t.header.importWorkflow}</span>
          </button>
          <button
            onClick={() => setIsExportOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-[#161924] hover:bg-[#1E2333] text-gray-300 border border-[#2B3145] transition-colors"
            title="导出"
          >
            <Download className="w-3.5 h-3.5 text-primary" />
            <span>{t.header.exportWorkflow}</span>
          </button>
        </div>

        {/* Language Switcher */}
        <button
          onClick={() => setLanguage(language === "en" ? "zh" : "en")}
          className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-mono text-gray-400 hover:text-gray-200 bg-[#161924] border border-[#2B3145] transition-colors"
          title={t.header.switchLang}
        >
          <Globe className="w-3 h-3 text-gray-400" />
          <span className="text-[11px]">{language === "en" ? "EN" : "中"}</span>
        </button>

        {/* User Account / Auth Section */}
        {isAuthenticated && user ? (
          <div className="relative">
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#161924] hover:bg-[#1E2333] border border-[#2B3145] transition-colors"
            >
              <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-[10px]">
                {user.nickname ? user.nickname.charAt(0).toUpperCase() : user.username.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs font-medium text-gray-200 max-w-[90px] truncate">
                {user.nickname || user.username}
              </span>
              <ChevronDown className="w-3 h-3 text-gray-400" />
            </button>

            {isUserMenuOpen && (
              <div className="absolute right-0 mt-1 w-44 bg-[#161924] border border-[#2B3145] rounded-lg shadow-2xl py-1 z-50">
                <div className="px-3 py-1.5 border-b border-[#232738]">
                  <p className="text-xs font-semibold text-gray-200 truncate">{user.nickname || user.username}</p>
                  <p className="text-[10px] text-gray-500 truncate">{user.email}</p>
                </div>
                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    openProjectManager();
                  }}
                  className="w-full px-3 py-1.5 text-left text-xs text-gray-300 hover:bg-[#1E2333] hover:text-white flex items-center gap-2"
                >
                  <FolderKanban className="w-3.5 h-3.5 text-primary" />
                  {t.project.myProjects}
                </button>
                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    logout();
                  }}
                  className="w-full px-3 py-1.5 text-left text-xs text-rose-400 hover:bg-rose-950/30 flex items-center gap-2 border-t border-[#232738]"
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
            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-primary hover:bg-primary/90 text-white text-xs font-medium shadow transition-all"
          >
            <UserIcon className="w-3.5 h-3.5" />
            <span>{t.auth.loginTab}</span>
          </button>
        )}
      </div>

      <CodeExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
      />

      <ImportWorkflowModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
      />
    </header>
  );
}
