# SysOne GX：TypeSafe System One 可视化决策工作流工作台

> 为 **TypeSafe System One（Jev）** 概率决策模型打造的可视化决策树编排、仿真与代码导出工作台。
> Visual decision-tree studio, simulator and code exporter for TypeSafe System One (Jev) models.

提示工程与 AI 工作流开发者可以在画布上编排多问题并行评估批次、配置置信度兜底防线、运行本地仿真或真实模型调用，并一键导出可直接落地的生产代码。

---

## ✨ 核心能力

1. **多问题并行评估（`batchNode`）**
   - 一次 API 调用并行评估多个问题：`client.system_one(state=..., questions={...})`。
   - 支持三种问题类型：**Choice**（分类路由）、**Score**（有序档位评分）、**Noul**（校准概率）。
   - 支持推测式扇出（Speculative fan-out）：一次调用问全量问题，代码忽略无用答案；下游批处理可一键合并到上游，省一次网络往返。

2. **置信度兜底防线（Guardrail）**
   - Choice / Score 走 `confidence` 区间兜底，Noul 走独立校准概率区间送审。
   - 低置信/不确定时经 `fallback_handle` 自动路由到人工复核或升级队列。
   - Noul 阈值可按问题单独配置（默认 是 ≥0.7 / 否 ≤0.3），按误判成本调整。

3. **可视化画布与 Inspector**
   - 基于 React Flow 的拖拽画布：评估批处理节点、动作节点（Webhook / 人工复核 / 大模型升级 / 数据库更新 / API 返回）。
   - 右侧 Inspector 实时调参：指令、选项定义（`what`）、排除条件（`not_for`）、示例、评分档位、阈值。
   - 内置工作流规格校验：Choice 1~255 选项、Score 2~10 有序档位，超限即时提示。

4. **实时沙盒与仿真追踪**
   - 内置客服分流等预设工单，也支持任意文本 / JSON 状态输入。
   - 留空 Key 走本地高速仿真引擎；填入 OpenRouter Key 走 `typesafe/jev-1.13` 真实调用。
   - 画布动画 + 概率分布 + 执行日志，还原整条决策路径。

5. **生产代码导出**
   - 一键导出 **Python SDK（`typesafe_sdk`）**、**TypeScript / Node.js**（直调 `https://api.typesafe.ai/v1/systemone`）、**OpenRouter Decisions（Alpha）**、**工作流 DSL（JSON）**。

6. **中英双语（i18n）**
   - 简体中文 / English 一键切换，中文界面只显示中文、英文界面只显示英文。

7. **账号与项目管理**
   - 注册 / 登录（bcrypt + JWT，7 天会话），项目与账号严格绑定、版本追踪、逻辑软删除。

---

## 🧱 项目结构

```
sysone-gx/
├── src/                    # 前端（Vite + React 19 + TS）
│   ├── components/         # 画布节点、Inspector、沙盒、导出弹窗、项目管理、鉴权
│   ├── store/              # Zustand 工作流状态（含模板、仿真、项目存取）
│   ├── utils/              # 仿真引擎、代码生成器、模型映射、OpenRouter 客户端、校验器
│   ├── types/              # Question / Batch / Action 类型定义
│   ├── api/                # 后端接口客户端（含 Token 拦截）
│   └── i18n/               # 中英双语词条
├── server/                 # 后端（Express 5 + TS）
│   ├── routes/             # /api/auth、/api/projects 路由
│   ├── controllers/        # 请求处理
│   ├── services/           # 注册登录、项目 CRUD（软删除、版本递增）
│   ├── middleware/         # JWT 鉴权
│   └── db.ts / config.ts   # pg 连接池、环境配置
├── sql/                    # 数据库初始化脚本（含软删除与审计字段）
├── deploy/                 # 线上 Nginx / 证书 / 运维架构文档
├── techdebt/               # 技术债台账（_index.md 为全局索引）
└── dist/                   # 前端生产构建产物（后端直接托管）
```

## 🛠️ 技术栈

| 层 | 选型 |
|---|---|
| 前端 | Vite 8 + React 19 + TypeScript + Tailwind CSS 3 + Lucide |
| 流程画布 | `@xyflow/react`（React Flow 12） |
| 状态管理 | Zustand |
| 后端 | Express 5 + `tsx` 直跑 TS |
| 数据库 | PostgreSQL 16（`pg` 连接池） |
| 认证 | bcryptjs + jsonwebtoken（7 天有效期） |
| 质量门禁 | Oxlint + `tsc -b`（构建前必过） |

---

## 🚀 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 准备数据库

```bash
# 新建库并执行初始化脚本（建表语句均带中文注释；执行前请先审阅 sql/ 下脚本内容）
psql -U sysone_admin -d sysone_gx -f sql/001_init_user_and_project_tables.sql
```

### 3. 配置环境变量（可选，均有开发默认值）

| 变量 | 默认值 | 说明 |
|---|---|---|
| `PORT` | `3004` | 后端监听端口 |
| `DATABASE_URL` | 本地 `sysone_gx` 库 | PostgreSQL 连接串 |
| `JWT_SECRET` | 内置开发密钥 | **生产必须替换** |
| `SESSION_SALT` | 内置开发盐 | **生产必须替换** |
| `CORS_ORIGIN` | `*` | 生产建议收紧为前端域名 |

### 4. 启动

```bash
# 前端开发服（http://localhost:5173/）
pnpm dev

# 后端 API 服（http://localhost:3004/，需先备好数据库）
pnpm server
```

### 5. 构建与校验

```bash
pnpm lint     # Oxlint
pnpm build    # tsc -b && vite build，产物输出到 dist/
```

---

## 🔌 后端接口一览

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/auth/register` | 注册（自动创建示例决策流项目） |
| POST | `/api/auth/login` | 登录（用户名或邮箱） |
| GET | `/api/auth/me` | 当前用户信息（需 Token） |
| POST | `/api/auth/logout` | 登出（吊销会话） |
| GET | `/api/projects` | 我的项目列表 |
| POST | `/api/projects` | 新建项目 |
| GET | `/api/projects/:id` | 项目详情（含画布工作流） |
| PUT | `/api/projects/:id` | 保存项目（版本号自动递增，非法工作流 400） |
| DELETE | `/api/projects/:id` | 软删除项目 |
| GET | `/api/health` | 服务探活 |

认证方式：`Authorization: Bearer <token>`。

---

## 🌐 线上部署

生产架构与日常运维命令见 `deploy/10-app-sysone-gx.md`（PM2 常驻 + Nginx SNI 分流 + PostgreSQL 本地库）。标准上线流程：

```bash
cd /opt/sysone-gx
git pull origin main
pnpm install
pnpm build
pm2 reload sysone-backend
curl -s http://127.0.0.1:3004/api/health
```

---

## 📝 协作约定（摘要）

- 前端优先复用已有组件，不引入新依赖；后端参照既有模块结构，删除一律软删除。
- 涉及 `sql/` 的执行须先审阅；代理配置不提交、不丢失。
- 提交聚焦本次范围、单一功能集、中文描述；技术债记入 `techdebt/` 并同步 `_index.md`。
- 完整规范见 `AGENTS.md`。

---

## © 许可证：MIT

本项目以 **MIT License** 开源，全文见 [`LICENSE`](./LICENSE)。可自由使用、复制、修改、分发（含闭源商用），保留版权声明即可。

`package.json` 中以 `MIT`（SPDX）标识。
