import { create } from 'zustand';
import { authApi, getStoredToken, setStoredToken, clearStoredToken } from '../api/client';

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  nickname: string;
  avatar: string;
}

interface AuthState {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAuthModalOpen: boolean;
  authModalTab: 'login' | 'register';

  openAuthModal: (tab?: 'login' | 'register') => void;
  closeAuthModal: () => void;
  setAuthModalTab: (tab: 'login' | 'register') => void;

  login: (account: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string, nickname?: string) => Promise<string | undefined>;
  logout: () => Promise<void>;
  initAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, _get) => ({
  user: null,
  token: getStoredToken(),
  isAuthenticated: Boolean(getStoredToken()),
  isLoading: false,
  isAuthModalOpen: false,
  authModalTab: 'login',

  openAuthModal: (tab = 'login') => set({ isAuthModalOpen: true, authModalTab: tab }),
  closeAuthModal: () => set({ isAuthModalOpen: false }),
  setAuthModalTab: (tab) => set({ authModalTab: tab }),

  login: async (account, password) => {
    set({ isLoading: true });
    try {
      const res = await authApi.login({ account, password });
      setStoredToken(res.token);
      set({
        user: res.user,
        token: res.token,
        isAuthenticated: true,
        isAuthModalOpen: false,
        isLoading: false
      });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  register: async (username, email, password, nickname) => {
    set({ isLoading: true });
    try {
      const res = await authApi.register({ username, email, password, nickname });
      setStoredToken(res.token);
      set({
        user: res.user,
        token: res.token,
        isAuthenticated: true,
        isAuthModalOpen: false,
        isLoading: false
      });
      return res.defaultProjectId;
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    try {
      await authApi.logout();
    } catch (e) {
      console.warn('Logout api notification failed:', e);
    } finally {
      clearStoredToken();
      set({
        user: null,
        token: null,
        isAuthenticated: false
      });
    }
  },

  initAuth: async () => {
    const token = getStoredToken();
    if (!token) {
      set({ isAuthenticated: false, user: null });
      return;
    }

    try {
      const user = await authApi.me();
      set({ user, isAuthenticated: true });
    } catch {
      clearStoredToken();
      set({ user: null, token: null, isAuthenticated: false });
    }
  }
}));
