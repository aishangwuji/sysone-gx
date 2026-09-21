-- ====================================================================
-- SysOne GX (TypeSafe 决策工作流系统) · 数据库表结构初始化脚本
-- 数据库类型: PostgreSQL 16
-- 规范遵循: 软删除机制 (is_deleted/deleted_at)、审计追踪字段、全表及字段自闭环中文注释
-- 编码格式: UTF-8 无 BOM
-- ====================================================================

-- 启用 UUID 生成扩展（如果尚未启用）
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- --------------------------------------------------------------------
-- 1. 用户账号表: sysone_users
-- 说明: 存储平台用户核心认证凭证、个人资料与账号状态
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sysone_users (
    id VARCHAR(64) PRIMARY KEY,                                      -- 用户全局唯一主键标识 (UUID 或 CUID)
    username VARCHAR(64) NOT NULL,                                   -- 用户名 (唯一登录标识，由字母、数字或下划线组成)
    email VARCHAR(128) NOT NULL,                                     -- 电子邮箱 (唯一邮箱地址，用于密码找回与通知)
    password_hash VARCHAR(255) NOT NULL,                             -- 密码哈希散列值 (使用 bcrypt 或 argon2 加盐哈希加密存储)
    nickname VARCHAR(64) DEFAULT '',                                 -- 用户自定义显示昵称
    avatar TEXT DEFAULT '',                                          -- 用户个人头像网络访问地址
    status SMALLINT DEFAULT 1 NOT NULL,                              -- 账号状态标识: 1-正常有效, 0-禁用封禁, 2-未激活/待验证
    last_login_at TIMESTAMPTZ DEFAULT NULL,                          -- 最近一次成功登录的时间戳
    last_login_ip VARCHAR(64) DEFAULT '',                            -- 最近一次成功登录的客户端 IP 地址
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,       -- 记录创建时间 (BaseEntity 基础审计字段)
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,       -- 记录最后更新时间 (BaseEntity 基础审计字段)
    is_deleted BOOLEAN DEFAULT FALSE NOT NULL,                       -- 逻辑软删除标志: false-有效未删除, true-已逻辑删除
    deleted_at TIMESTAMPTZ DEFAULT NULL                              -- 逻辑软删除发生时间戳
);

-- 唯一与常用查询索引
CREATE UNIQUE INDEX IF NOT EXISTS uk_sysone_users_username_active ON sysone_users (username) WHERE is_deleted = FALSE;
CREATE UNIQUE INDEX IF NOT EXISTS uk_sysone_users_email_active ON sysone_users (email) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_sysone_users_status ON sysone_users (status) WHERE is_deleted = FALSE;

-- 表注释与字段自闭环中文注释
COMMENT ON TABLE sysone_users IS '平台用户账号信息主表，存储登录凭据、个人信息与账号审计状态';
COMMENT ON COLUMN sysone_users.id IS '用户全局唯一主键标识 (UUID 或 CUID)';
COMMENT ON COLUMN sysone_users.username IS '用户名 (唯一登录标识，由字母、数字或下划线组成)';
COMMENT ON COLUMN sysone_users.email IS '电子邮箱 (唯一邮箱地址，用于密码找回与通知)';
COMMENT ON COLUMN sysone_users.password_hash IS '密码哈希散列值 (使用 bcrypt 加盐哈希安全加密存储，禁止明文)';
COMMENT ON COLUMN sysone_users.nickname IS '用户自定义显示昵称';
COMMENT ON COLUMN sysone_users.avatar IS '用户个人头像网络访问地址';
COMMENT ON COLUMN sysone_users.status IS '账号状态标识: 1-正常有效, 0-禁用封禁, 2-未激活/待验证';
COMMENT ON COLUMN sysone_users.last_login_at IS '最近一次成功登录的时间戳';
COMMENT ON COLUMN sysone_users.last_login_ip IS '最近一次成功登录的客户端 IP 地址';
COMMENT ON COLUMN sysone_users.created_at IS '记录创建时间 (BaseEntity 基础审计字段)';
COMMENT ON COLUMN sysone_users.updated_at IS '记录最后更新时间 (BaseEntity 基础审计字段)';
COMMENT ON COLUMN sysone_users.is_deleted IS '逻辑软删除标志: false-有效未删除, true-已逻辑删除';
COMMENT ON COLUMN sysone_users.deleted_at IS '逻辑软删除发生时间戳';


-- --------------------------------------------------------------------
-- 2. 决策流项目表: sysone_projects
-- 说明: 存储用户创建的决策流项目实体与图结构数据，严格绑定所有者账号
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sysone_projects (
    id VARCHAR(64) PRIMARY KEY,                                      -- 项目全局唯一主键标识
    user_id VARCHAR(64) NOT NULL,                                    -- 所属用户账号 ID，与 sysone_users.id 建立主外键绑定关系
    name VARCHAR(128) NOT NULL,                                      -- 决策流项目名称 (如: 客户服务智能分流、合规审查决策树)
    description TEXT DEFAULT '',                                     -- 决策流项目详细业务场景说明与描述
    icon VARCHAR(64) DEFAULT 'FolderKanban',                         -- 项目前端展示用图标标识
    workflow_data JSONB DEFAULT '{"nodes":[],"edges":[]}'::jsonb NOT NULL, -- 决策树完整工作流图数据 (包含节点、连接线引脚、配置参数)
    template_type VARCHAR(32) DEFAULT 'custom' NOT NULL,             -- 模板初始来源类型: custom-空白自定义, support_triage-客服分流, compliance-合规审查
    version INT DEFAULT 1 NOT NULL,                                  -- 项目工作流版本自增计数号
    is_active BOOLEAN DEFAULT TRUE NOT NULL,                         -- 项目启用状态: true-激活可用, false-休眠冻结
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,       -- 记录创建时间 (BaseEntity 基础审计字段)
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,       -- 记录最后更新时间 (BaseEntity 基础审计字段)
    created_by VARCHAR(64) DEFAULT NULL,                             -- 创建人用户 ID
    updated_by VARCHAR(64) DEFAULT NULL,                             -- 最后修改人用户 ID
    is_deleted BOOLEAN DEFAULT FALSE NOT NULL,                       -- 逻辑软删除标志: false-有效未删除, true-已逻辑删除
    deleted_at TIMESTAMPTZ DEFAULT NULL                              -- 逻辑软删除发生时间戳
);

-- 常用查询索引与外键关联
CREATE INDEX IF NOT EXISTS idx_sysone_projects_user_id ON sysone_projects (user_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_sysone_projects_updated_at ON sysone_projects (updated_at DESC) WHERE is_deleted = FALSE;

-- 表注释与字段自闭环中文注释
COMMENT ON TABLE sysone_projects IS '决策流项目配置主表，存储绑定的用户账号、决策树拓扑 JSON 数据与生命周期元数据';
COMMENT ON COLUMN sysone_projects.id IS '项目全局唯一主键标识';
COMMENT ON COLUMN sysone_projects.user_id IS '所属用户账号 ID，与 sysone_users.id 建立主外键绑定关系';
COMMENT ON COLUMN sysone_projects.name IS '决策流项目名称 (如: 客户服务智能分流、合规审查决策树)';
COMMENT ON COLUMN sysone_projects.description IS '决策流项目详细业务场景说明与描述';
COMMENT ON COLUMN sysone_projects.icon IS '项目前端展示用图标标识';
COMMENT ON COLUMN sysone_projects.workflow_data IS '决策树完整工作流图数据 (包含节点、连接线引脚、配置参数，以 JSONB 原生高效格式持久化)';
COMMENT ON COLUMN sysone_projects.template_type IS '模板初始来源类型: custom-空白自定义, support_triage-客服分流, compliance-合规审查';
COMMENT ON COLUMN sysone_projects.version IS '项目工作流版本自增计数号';
COMMENT ON COLUMN sysone_projects.is_active IS '项目启用状态: true-激活可用, false-休眠冻结';
COMMENT ON COLUMN sysone_projects.created_at IS '记录创建时间 (BaseEntity 基础审计字段)';
COMMENT ON COLUMN sysone_projects.updated_at IS '记录最后更新时间 (BaseEntity 基础审计字段)';
COMMENT ON COLUMN sysone_projects.created_by IS '创建人用户 ID (BaseEntity 审计字段)';
COMMENT ON COLUMN sysone_projects.updated_by IS '最后修改人用户 ID (BaseEntity 审计字段)';
COMMENT ON COLUMN sysone_projects.is_deleted IS '逻辑软删除标志: false-有效未删除, true-已逻辑删除 (业务层只查 false 记录)';
COMMENT ON COLUMN sysone_projects.deleted_at IS '逻辑软删除发生时间戳';


-- --------------------------------------------------------------------
-- 3. 用户会话与认证凭证表: sysone_user_sessions
-- 说明: 存储用户登录产生的 Session/Token 哈希，支持重启不失效与多端安全下线
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sysone_user_sessions (
    id VARCHAR(64) PRIMARY KEY,                                      -- 会话唯一主键标识
    user_id VARCHAR(64) NOT NULL,                                    -- 关联的用户账号 ID
    token_hash VARCHAR(128) NOT NULL,                                -- 会话 Token 加盐安全哈希值 (SHA-256)，绝不存明文 Token
    ip_address VARCHAR(64) DEFAULT '',                               -- 会话签发时的客户端 IP 地址
    user_agent TEXT DEFAULT '',                                      -- 客户端浏览器与操作系统标识
    expires_at TIMESTAMPTZ NOT NULL,                                 -- 会话绝对失效过期时间
    last_active_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,   -- 会话最近一次活跃调用时间戳
    is_revoked BOOLEAN DEFAULT FALSE NOT NULL,                       -- 是否已被用户主动登出或管理员强制吊销: true-已作废, false-有效
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,       -- 会话创建时间
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,       -- 会话信息更新时间
    is_deleted BOOLEAN DEFAULT FALSE NOT NULL,                       -- 逻辑软删除标志: false-有效未删除, true-已逻辑删除
    deleted_at TIMESTAMPTZ DEFAULT NULL                              -- 逻辑软删除发生时间戳
);

-- 索引配置
CREATE UNIQUE INDEX IF NOT EXISTS uk_sysone_user_sessions_token_hash ON sysone_user_sessions (token_hash) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_sysone_user_sessions_user_id ON sysone_user_sessions (user_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_sysone_user_sessions_expires_at ON sysone_user_sessions (expires_at) WHERE is_deleted = FALSE;

-- 表注释与字段自闭环中文注释
COMMENT ON TABLE sysone_user_sessions IS '用户登录会话认证管理表，存储加盐哈希后的身份凭据与会话有效期';
COMMENT ON COLUMN sysone_user_sessions.id IS '会话唯一主键标识';
COMMENT ON COLUMN sysone_user_sessions.user_id IS '关联的用户账号 ID';
COMMENT ON COLUMN sysone_user_sessions.token_hash IS '会话 Token 加盐安全哈希值 (SHA-256)，防脱库明文泄露';
COMMENT ON COLUMN sysone_user_sessions.ip_address IS '会话签发时的客户端 IP 地址';
COMMENT ON COLUMN sysone_user_sessions.user_agent IS '客户端浏览器与操作系统标识';
COMMENT ON COLUMN sysone_user_sessions.expires_at IS '会话绝对失效过期时间';
COMMENT ON COLUMN sysone_user_sessions.last_active_at IS '会话最近一次活跃调用时间戳';
COMMENT ON COLUMN sysone_user_sessions.is_revoked IS '是否已被用户主动登出或管理员强制吊销: true-已作废, false-有效';
COMMENT ON COLUMN sysone_user_sessions.created_at IS '会话创建时间';
COMMENT ON COLUMN sysone_user_sessions.updated_at IS '会话信息更新时间';
COMMENT ON COLUMN sysone_user_sessions.is_deleted IS '逻辑软删除标志: false-有效未删除, true-已逻辑删除';
COMMENT ON COLUMN sysone_user_sessions.deleted_at IS '逻辑软删除发生时间戳';
