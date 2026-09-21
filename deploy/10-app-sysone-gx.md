# 10 · 应用：sysone.originagent.cn 智能决策流工作台

> 上线日期：2026-09-21 ｜ 类型：Node.js Express + React SPA 全栈服务 ｜ 域名：https://sysone.originagent.cn

## 一、概述

| 项 | 值 |
|----|----|
| 域名 | sysone.originagent.cn |
| DNS | Cloudflare 代理 (172.67.203.139 / 104.21.77.21) 指向源站 154.9.224.192 |
| 项目路径 | `/opt/sysone-gx` |
| 仓库地址 | `https://github.com/aishangwuji/sysone-gx.git` |
| 服务模式 | PM2 常驻 Node 进程（Express API + Vite React 静态托管） |
| PM2 进程名 | `sysone-backend` (PM2 id 2, fork 模式) |
| 本地监听端口 | `127.0.0.1:3004` |
| 数据库 | PostgreSQL 16 本地库 `sysone_gx`，专属角色 `sysone_admin` |
| 站点配置 | `/etc/nginx/conf.d/sysone-ssl.conf`（`listen 8444 ssl; server_name sysone.originagent.cn;`） |
| ACME 配置 | `/etc/nginx/conf.d/acme-sysone.conf`（80：challenge + 301） |
| 证书 | `/etc/letsencrypt/live/sysone.originagent.cn/`（到期 2026-12-20，certbot 自动续期） |
| SNI 分流 | `/etc/nginx/nginx.conf` stream map 内 `sysone.originagent.cn nginx_https;` |
| 日志 | `/var/log/nginx/sysone-ssl-access.log` / `sysone-ssl-error.log`，PM2 日志 `~/.pm2/logs/sysone-backend-*.log` |

## 二、架构拓扑

```
客户端 → 443 (nginx stream, ssl_preread SNI=sysone.originagent.cn)
       → upstream nginx_https (127.0.0.1:8444)
       → server_name sysone.originagent.cn (sysone-ssl.conf)
       → proxy_pass http://127.0.0.1:3004 (PM2: sysone-backend)
           ├─ /api/auth/*     (用户注册、登录、信息获取、登出)
           ├─ /api/projects/* (项目创建、列表、保存、软删除)
           ├─ /api/health     (服务探活)
           └─ /*              (SPA 前端静态资源兜底 /dist)
       → 数据持久化: 本地 PostgreSQL 16 (sysone_gx 库)
```

## 三、核心特性与安全规范

1. **用户与项目绑定**：严格绑定多租户用户与项目关系，所有项目增删改查附带 `user_id` 鉴权隔离。
2. **软删除规范**：所有数据删除均采用逻辑软删除（`is_deleted = true`, `deleted_at = NOW()`），审计字段对齐 BaseEntity。
3. **OpenRouter 凭证安全**：不在服务器或公共前端持久化外部用户 API 密钥，执行确定性安全沙箱模拟。
4. **认证加密**：用户密码采用 bcrypt 哈希加盐存储，Session 采用 SHA-256 签名校验与 JWT 无状态凭证。

## 四、日常运维命令

```bash
# 查看后端进程状态与内存
pm2 status sysone-backend
pm2 logs sysone-backend --lines 50

# 重启或重载后端
pm2 reload sysone-backend

# 重新拉取与构建上线
cd /opt/sysone-gx
git pull origin main
pnpm install
pnpm build
pm2 reload sysone-backend

# 健康检查
curl -sI https://sysone.originagent.cn/
curl -s http://127.0.0.1:3004/api/health
```
