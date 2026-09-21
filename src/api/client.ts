/**
 * 统一 API 请求客户端与拦截器
 * 自动注入 Bearer Token，处理统一返回结构与错误拦截
 */

const TOKEN_KEY = 'sysone_auth_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    ...options,
    headers
  });

  let result: ApiResponse<T>;
  try {
    result = await response.json();
  } catch (err: any) {
    throw new Error('网络响应解析失败: ' + err.message);
  }

  if (response.status === 401) {
    // 凭证失效，清理本地缓存
    clearStoredToken();
  }

  if (result.code !== 200) {
    throw new Error(result.message || '请求失败');
  }

  return result.data;
}

export const authApi = {
  register: (data: { username: string; email: string; password: string; nickname?: string }) =>
    request<{ user: any; token: string; defaultProjectId?: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  login: (data: { account: string; password: string }) =>
    request<{ user: any; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  me: () => request<any>('/api/auth/me'),

  logout: () => request<boolean>('/api/auth/logout', { method: 'POST' })
};

export const projectsApi = {
  list: () => request<any[]>('/api/projects'),

  getById: (id: string) => request<any>(`/api/projects/${id}`),

  create: (data: { name: string; description?: string; templateType?: string; workflowData?: any }) =>
    request<any>('/api/projects', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  update: (id: string, data: { name?: string; description?: string; workflowData?: any }) =>
    request<any>(`/api/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  delete: (id: string) =>
    request<boolean>(`/api/projects/${id}`, {
      method: 'DELETE'
    })
};
