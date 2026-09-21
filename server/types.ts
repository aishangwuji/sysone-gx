/**
 * 统一数据模型定义与响应规范
 * 包含 BaseEntity 规范、软删除、审计追踪与业务实体
 */

export interface BaseEntity {
  id: string;
  created_at: Date | string;
  updated_at: Date | string;
  is_deleted: boolean;
  deleted_at?: Date | string | null;
  created_by?: string | null;
  updated_by?: string | null;
}

export interface User extends BaseEntity {
  username: string;
  email: string;
  password_hash: string;
  nickname: string;
  avatar: string;
  status: number; // 1: 正常, 0: 禁用
  last_login_at?: Date | string | null;
  last_login_ip?: string;
}

export interface ProjectWorkflowData {
  nodes: any[];
  edges: any[];
  settings?: Record<string, any>;
}

export interface Project extends BaseEntity {
  user_id: string;
  name: string;
  description: string;
  icon: string;
  workflow_data: ProjectWorkflowData;
  template_type: string;
  version: number;
  is_active: boolean;
}

export interface UserSession extends BaseEntity {
  user_id: string;
  token_hash: string;
  ip_address: string;
  user_agent: string;
  expires_at: Date | string;
  last_active_at: Date | string;
  is_revoked: boolean;
}

export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T | null;
}
