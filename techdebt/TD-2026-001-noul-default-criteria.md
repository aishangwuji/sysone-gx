---
schema_version: 1
---

# TD-2026-001: Noul 无 criteria 时硬塞默认 true/false 文案

## 基本信息
| 字段 | 内容 |
|------|------|
| 发现时间 | 2026-09-21 |
| 发现人 | Muse Spark（Agent 对照官方文档核查） |
| 关联Spec | 无（源于官方 Choice/Score/Noul 文档对照评审） |
| 关联规则 | 生产级工程导向（最小化实现：无 criteria 即不发，不堆砌默认文案） |
| 优先级 | P2 |
| 状态 | 已解决 |

## 详细描述
官方文档明确 Noul 的 `criteria` 为可选字段，建议先不加、跑通后再对比决定是否加。`src/utils/openRouterClient.ts:61-64` 在 `q.criteria` 为空时自动填入通用英文 `true/false` 描述后随请求发出，等于每次都多告诉模型一句废话，会轻微扰动 Noul 概率校准，且与“可选”语义不符。同项目的 Python 代码导出（`src/utils/codeGenerator.ts:44-46`，无则省略）已经是对的，两处行为不一致。

## 影响范围
- **影响文件**：`src/utils/openRouterClient.ts:57-66`（`callOpenRouterDecisions` 内 Noul 分支）
- **影响功能**：经 OpenRouter Decisions 通道发起的所有无 criteria Noul 问题的线上判定分布
- **潜在风险**：不修复仅造成轻微校准漂移；长期会让“加/不加 criteria 对比实验”失去干净基线

## 复现/验证路径
1. 在画布新建 Noul 问题，不填 `criteria.true/false`。
2. 经 Live 通道抓包，可见请求体 `questions.<id>` 仍带有 `criteria: {true: "Affirmative ...", false: "Negative ..."}`。
3. 修复后复查：无 criteria 的 Noul 请求体中不应出现 `criteria` 键。

## 修复方案（可选）
```ts
if (q.criteria?.true || q.criteria?.false) payload.criteria = q.criteria;
// 否则整个 question 不带 criteria 字段
```
与 Python 导出逻辑看齐；TS/OpenRouter 导出同步省略逻辑。预计 5 分钟，回归风险极低。

## 评审记录
| 日期 | 评审人 | 结论 |
|------|--------|------|
| 2026-09-21 | 用户 | 确认修法：去掉默认值，无则不发 |
