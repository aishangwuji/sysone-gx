import React, { useState } from 'react';
import { useWorkflowStore } from '../../store/useWorkflowStore';
import { useAuthStore } from '../../store/useAuthStore';
import { X, Plus, FolderKanban, Trash2, ArrowRight, Check, AlertCircle, Loader2 } from 'lucide-react';
import clsx from 'clsx';

export function ProjectManagerModal() {
  const {
    isProjectManagerOpen,
    closeProjectManager,
    currentProjectId,
    projectsList,
    fetchUserProjects,
    loadProjectById,
    createNewProject,
    deleteProjectById,
    t
  } = useWorkflowStore();

  const { isAuthenticated, openAuthModal } = useAuthStore();

  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [newTemplateType, setNewTemplateType] = useState('support_triage');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isProjectManagerOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) {
      setErrorMsg('请输入项目名称');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);
    try {
      await createNewProject({
        name: newProjectName.trim(),
        description: newProjectDesc.trim(),
        templateType: newTemplateType
      });
      setIsCreating(false);
      setNewProjectName('');
      setNewProjectDesc('');
      closeProjectManager();
    } catch (err: any) {
      setErrorMsg(err.message || '创建项目失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (projId: string, projName: string) => {
    if (window.confirm(t.project.deleteConfirm + `\n[${projName}]`)) {
      try {
        await deleteProjectById(projId);
        await fetchUserProjects();
      } catch (err: any) {
        alert(err.message || '删除失败');
      }
    }
  };

  const handleLoad = async (projId: string) => {
    try {
      await loadProjectById(projId);
      closeProjectManager();
    } catch (err: any) {
      alert(err.message || '加载项目失败');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-[#121520] border border-[#282D3D] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 bg-[#151821] border-b border-[#282D3D] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 text-primary">
              <FolderKanban className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-100">{t.project.title}</h3>
              <p className="text-xs text-gray-400">{t.project.subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isCreating && (
              <button
                onClick={() => {
                  if (!isAuthenticated) {
                    openAuthModal('login');
                    return;
                  }
                  setIsCreating(true);
                }}
                className="px-3 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-primary/20 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                {t.project.newProject}
              </button>
            )}
            <button
              onClick={closeProjectManager}
              className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-[#202533] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 bg-[#0B0D13]">
          {errorMsg && (
            <div className="p-3 mb-4 rounded-lg bg-rose-950/60 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {isCreating ? (
            /* Create Project Form */
            <form onSubmit={handleCreate} className="space-y-4 bg-[#141824] p-4 rounded-xl border border-[#282D3D]">
              <div className="flex items-center justify-between border-b border-[#282D3D] pb-3">
                <h4 className="text-sm font-bold text-gray-200">{t.project.newProject}</h4>
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="text-xs text-gray-400 hover:text-gray-200"
                >
                  {t.project.cancelBtn}
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-gray-300 mb-1">
                  {t.project.projectName} *
                </label>
                <input
                  type="text"
                  required
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder={t.project.projectNamePlaceholder}
                  className="w-full bg-[#0F1118] border border-[#282D3D] rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-gray-300 mb-1">
                  {t.project.projectDesc}
                </label>
                <textarea
                  rows={2}
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  placeholder={t.project.projectDescPlaceholder}
                  className="w-full bg-[#0F1118] border border-[#282D3D] rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-gray-300 mb-1">
                  {t.project.templateType}
                </label>
                <select
                  value={newTemplateType}
                  onChange={(e) => setNewTemplateType(e.target.value)}
                  className="w-full bg-[#0F1118] border border-[#282D3D] rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-primary"
                >
                  <option value="support_triage">{t.project.templateSupport}</option>
                  <option value="custom">{t.project.templateBlank}</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-3 py-1.5 rounded-lg bg-[#202533] text-gray-300 hover:text-white text-xs"
                >
                  {t.project.cancelBtn}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  {t.project.createBtn}
                </button>
              </div>
            </form>
          ) : !isAuthenticated ? (
            <div className="text-center py-12 space-y-3">
              <FolderKanban className="w-10 h-10 text-gray-600 mx-auto" />
              <p className="text-xs text-gray-400">{t.auth.loginRequired}</p>
              <button
                onClick={() => openAuthModal('login')}
                className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold shadow-lg shadow-primary/20"
              >
                {t.auth.loginTab}
              </button>
            </div>
          ) : projectsList.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <FolderKanban className="w-10 h-10 text-gray-600 mx-auto" />
              <p className="text-xs text-gray-400">{t.project.noProjects}</p>
              <button
                onClick={() => setIsCreating(true)}
                className="px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold"
              >
                {t.project.newProject}
              </button>
            </div>
          ) : (
            /* Project List */
            <div className="space-y-3">
              {projectsList.map((proj) => {
                const isCurrent = proj.id === currentProjectId;
                return (
                  <div
                    key={proj.id}
                    className={clsx(
                      'p-4 rounded-xl border transition-all flex items-center justify-between',
                      isCurrent
                        ? 'bg-[#171B28] border-primary/40 shadow-sm'
                        : 'bg-[#121520] border-[#282D3D] hover:border-gray-600'
                    )}
                  >
                    <div className="space-y-1 max-w-[65%]">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-100">{proj.name}</span>
                        {isCurrent && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-primary/20 text-primary border border-primary/30">
                            {t.project.currentBadge}
                          </span>
                        )}
                      </div>
                      {proj.description && (
                        <p className="text-xs text-gray-400 line-clamp-1">{proj.description}</p>
                      )}
                      <div className="flex items-center gap-3 text-[11px] text-gray-400 pt-1 font-mono">
                        <span>{t.project.nodesCount.replace('{count}', String(proj.nodeCount || 0))}</span>
                        <span>•</span>
                        <span>{t.project.edgesCount.replace('{count}', String(proj.edgeCount || 0))}</span>
                        <span>•</span>
                        <span>{t.project.updatedAt.replace('{time}', new Date(proj.updatedAt).toLocaleDateString())}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDelete(proj.id, proj.name)}
                        className="p-2 rounded-lg text-gray-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                        title={t.project.deleteBtn}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleLoad(proj.id)}
                        disabled={isCurrent}
                        className={clsx(
                          'px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors',
                          isCurrent
                            ? 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 cursor-default'
                            : 'bg-[#222735] hover:bg-primary hover:text-white text-gray-200'
                        )}
                      >
                        {isCurrent ? <Check className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
                        {isCurrent ? t.project.currentBadge : t.project.openBtn}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
