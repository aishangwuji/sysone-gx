import React, { useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import { useWorkflowStore } from '../../store/useWorkflowStore';
import { X, Lock, Mail, User, AlertCircle, Loader2 } from 'lucide-react';
import clsx from 'clsx';

export function AuthModal() {
  const {
    isAuthModalOpen,
    closeAuthModal,
    authModalTab,
    setAuthModalTab,
    login,
    register,
    isLoading
  } = useAuthStore();

  const { t, loadProjectById } = useWorkflowStore();

  const [account, setAccount] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    try {
      if (authModalTab === 'login') {
        if (!account.trim() || !password.trim()) {
          setErrorMsg('请输入账号与密码');
          return;
        }
        await login(account.trim(), password);
        // 登录成功后拉取用户的首个项目
        const { fetchUserProjects } = useWorkflowStore.getState();
        const projects = await fetchUserProjects();
        if (projects && projects.length > 0) {
          await loadProjectById(projects[0].id);
        }
      } else {
        if (!username.trim() || !email.trim() || !password.trim()) {
          setErrorMsg('请填写完整的注册必填信息');
          return;
        }
        const defaultProjId = await register(
          username.trim(),
          email.trim(),
          password,
          nickname.trim()
        );
        if (defaultProjId) {
          await loadProjectById(defaultProjId);
        }
      }
      closeAuthModal();
    } catch (err: any) {
      setErrorMsg(err.message || '操作失败，请重试');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#121520] border border-[#282D3D] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 bg-[#151821] border-b border-[#282D3D] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/logo.webp"
              alt="SysOne GX"
              className="w-9 h-9 rounded-lg object-contain border border-[#282D3D] bg-[#0E1017] p-1"
            />
            <div>
              <h3 className="text-base font-bold text-gray-100">
                {authModalTab === 'login' ? t.auth.loginTitle : t.auth.registerTitle}
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {authModalTab === 'login' ? 'SysOne GX 决策模型可视化工作室' : '注册即享决策树云端多项目管理'}
              </p>
            </div>
          </div>
          <button
            onClick={closeAuthModal}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-[#202533] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-5 pt-4 flex gap-2 border-b border-[#282D3D] bg-[#0F1118]">
          <button
            type="button"
            onClick={() => {
              setAuthModalTab('login');
              setErrorMsg(null);
            }}
            className={clsx(
              'pb-2.5 text-xs font-semibold px-2 border-b-2 transition-colors',
              authModalTab === 'login'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            )}
          >
            {t.auth.loginTab}
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthModalTab('register');
              setErrorMsg(null);
            }}
            className={clsx(
              'pb-2.5 text-xs font-semibold px-2 border-b-2 transition-colors',
              authModalTab === 'register'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            )}
          >
            {t.auth.registerTab}
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 bg-[#0B0D13]">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {authModalTab === 'login' ? (
            <>
              <div>
                <label className="block text-[11px] font-medium text-gray-400 mb-1">
                  {t.auth.accountLabel}
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={account}
                    onChange={(e) => setAccount(e.target.value)}
                    placeholder={t.auth.accountPlaceholder}
                    className="w-full bg-[#121520] border border-[#282D3D] rounded-lg pl-9 pr-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-gray-400 mb-1">
                  {t.auth.passwordLabel}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t.auth.passwordPlaceholder}
                    className="w-full bg-[#121520] border border-[#282D3D] rounded-lg pl-9 pr-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-[11px] font-medium text-gray-400 mb-1">
                  {t.auth.usernameLabel}
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={t.auth.usernamePlaceholder}
                    className="w-full bg-[#121520] border border-[#282D3D] rounded-lg pl-9 pr-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-gray-400 mb-1">
                  {t.auth.emailLabel}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t.auth.emailPlaceholder}
                    className="w-full bg-[#121520] border border-[#282D3D] rounded-lg pl-9 pr-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-gray-400 mb-1">
                  {t.auth.passwordLabel}
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t.auth.passwordPlaceholder}
                    className="w-full bg-[#121520] border border-[#282D3D] rounded-lg pl-9 pr-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-gray-400 mb-1">
                  {t.auth.nicknameLabel}
                </label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder={t.auth.nicknamePlaceholder}
                  className="w-full bg-[#121520] border border-[#282D3D] rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-primary"
                />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-2.5 px-4 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-primary/20 transition-all"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : authModalTab === 'login' ? (
              t.auth.submitLogin
            ) : (
              t.auth.submitRegister
            )}
          </button>

          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={() => {
                setAuthModalTab(authModalTab === 'login' ? 'register' : 'login');
                setErrorMsg(null);
              }}
              className="text-xs text-gray-400 hover:text-primary transition-colors"
            >
              {authModalTab === 'login' ? t.auth.noAccount : t.auth.hasAccount}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
