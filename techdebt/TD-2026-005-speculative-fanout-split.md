---
schema_version: 1
---

# TD-2026-005: 推测式问题拆成两次 API 调用，多付成本

## 基本信息
| 字段 | 内容 |
|------|------|
| 发现时间 | 2026-09-21 |
| 发现人 | Muse Spark（Agent 对照官方文档核查） |
| 关联Spec | 无（源于官方 Choice/Score/Noul 文档对照评审） |
| 关联规则 | 生产级工程导向（最小化实现：同 state 问题应一次调用并行） |
| 优先级 | P3 |
| 状态 | 已确认 |

## 详细描述
官方推荐 Speculative fan-out：同一 `state` 的全部问题（含仅部分输入才用得上的推测式问题）放在一次调用里并行，代码忽略无用答案，只多花 question token。默认模板 `src/utils/defaultTemplates.ts:58-80` 把 `return_reason` 独立为第二个 batch（`batch_returns`），导致同一 ticket 需两次 `system_one` 调用，多付一次 state token 与一次 RTT。从正确性上没错，且两步路由对新手更直观，因此不直接合并默认模板。

## 影响范围
- **影响文件**：`src/utils/defaultTemplates.ts:58-80`（`batch_returns`）、画布 batch 合并操作（待新增）
- **影响功能**：默认客服分流模板的调用次数与 token 成本；用户对“推测式问题”最优实践的理解
- **潜在风险**：不修复仅多花成本；若粗暴合并默认模板会破坏新手引导与“依赖型第二问”演示意图

## 复现/验证路径
1. 用预设 ticket 跑默认模板仿真，trace 显示经过两个 batch（两次调用语义）。
2. 修复后验证：执行“合并”操作后同一 ticket 只剩一次 batch 调用，且终态 Action 与合并前一致。

## 修复方案（可选）
不动默认模板，新增画布操作“将下游 speculative batch 合并到上游”：把 `batch_returns.return_reason` 并入 `batch_primary`，边改写为条件路由（如 `q_department_returns` 命中后再读 `return_reason` 答案）。预计 1 天，回归风险中。真依赖型第二问（需第一问答案取数/定选项）仍保留两次调用，不在此债范围内。

## 评审记录
| 日期 | 评审人 | 结论 |
|------|--------|------|
| 2026-09-21 | 用户 | 确认修法：补一键合并操作，不动默认模板 |
