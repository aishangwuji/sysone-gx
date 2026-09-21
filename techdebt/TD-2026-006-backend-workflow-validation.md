---
schema_version: 1
---

# TD-2026-006: 后端缺 workflow_data 形状校验，脏数据直接入库

## 基本信息
| 字段 | 内容 |
|------|------|
| 发现时间 | 2026-09-21 |
| 发现人 | Muse Spark（Agent 对照官方文档核查） |
| 关联Spec | 无（源于官方 Choice/Score/Noul 文档对照评审） |
| 关联规则 | P0 红线·边界数据强制校验（前端 workflow 属跨越信任边界的输入，入库前必须显式校验） |
| 优先级 | P1 |
| 状态 | 已解决 |

## 详细描述
`server/` 无任何 `systemone/decisions` 相关逻辑，所有 TypeSafe 形状约束只活在前端：后端 `ProjectService.createProject/updateProject`（`server/services/projectService.ts`）对 `workflowData` 直接 `JSON.stringify` 入库，不校验 Choice option 数量（官方上限 255）、Score level 数量（官方要求 2-10 且有序）、Noul criteria 成对性、model 白名单。脏画布（如 Score 仅 1 个 level、Choice 0 个 option）可\DB 落盘，下次导出/调用时才 nổ。另本债触及 P0 红线“边界数据强制校验”，修复本身须走完整清单与独立核验。

## 影响范围
- **影响文件**：`server/services/projectService.ts`（create/update 入库点）、新增 `shared/validateWorkflow.ts`（前后端共用）、前端保存前调用点（`src/store/useWorkflowStore.ts:saveCurrentProject`）
- **影响功能**：项目创建/更新接口的 400 行为、前端保存前秒级提示、存量脏数据的暴露
- **潜在风险**：不修复则脏数据持续入库并在导出时爆炸；修复时若校验过严可能误拦存量合法画布，需保证“存量可读、新写严控”并给出字段级错误信息

## 复现/验证路径
1. 构造 `questions: [{type: score, criteria: ["仅一档"]}]` 调 `PUT /api/projects/:id`，当前 200 入库。
2. 修复后复查：同请求 400 并返回字段级错误（如 `nodes[0].questions[0].criteria: score 至少 2 个 level`）；前端保存同构画布时先弹错，不发请求。
3. 存量验证：全库 `workflow_data` 跑一遍校验脚本，输出脏数据清单先审阅再定迁移策略。

## 修复方案（可选）
分两步：第一步只做纯校验（无密钥、无外调）：抽 `validateWorkflow` 纯函数（Choice 1-255 option、Score 2-10 level、Noul criteria 成对或缺省、model 白名单），后端入库前调用、前后端复用；第二步后端代理 `api.typesafe.ai`（藏 Key、审计、计费归属）另议暂缓。预计第一步 1-2 天。注意：涉及 SQL/数据核查的执行须用户先审阅（AGENTS.md 第 7 条），存量扫描 SQL 先出脚本交审再跑。

## 评审记录
| 日期 | 评审人 | 结论 |
|------|--------|------|
| 2026-09-21 | 用户 | 确认分两步：先纯校验，代理暂缓；SQL 先审后执 |
