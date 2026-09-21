---
schema_version: 1
---

# TD-2026-004: Noul 阈值 0.7/0.3 写死，未按误判成本可配

## 基本信息
| 字段 | 内容 |
|------|------|
| 发现时间 | 2026-09-21 |
| 发现人 | Muse Spark（Agent 对照官方文档核查） |
| 关联Spec | 无（源于官方 Choice/Score/Noul 文档对照评审） |
| 关联规则 | 生产级工程导向（魔法数字显式化：阈值应为可配常量并注明语义） |
| 优先级 | P3 |
| 状态 | 已确认 |

## 详细描述
官方立场是 Noul 阈值取决于误判成本（0.5/0.8/0.9 皆有场景），项目将其写死三处：`src/utils/simulator.ts:141` 路由判断 `>=0.7 / <=0.3`、`src/components/Canvas/nodes/BatchNode.tsx` 经 `canvas.yesThreshold/noThreshold` 展示、`src/i18n/translations.ts:24-25/64/166-167/206` 文案把 0.7/0.3 表述为标准。当前是“设计简化”而非 Bug，但会让用户误以为 0.7/0.3 是官方标准，且高代价场景（如退款、安全）无法收紧。另与高风险项联动：Noul 无 `confidence`，兜底若仍走 `confidenceRange`，即使阈值可配也进不了 fallback（见仿真器 `lowestConfidence` 忽略 Noul 问题）。

## 影响范围
- **影响文件**：`src/utils/simulator.ts:140-146`、`src/types/workflow.ts`（`NoulQuestion` 类型）、`src/components/Inspector/NodeInspector.tsx:283-310`（Noul 编辑区）、`src/i18n/translations.ts`（中英阈值文案）
- **影响功能**：Noul yes/no 引脚路由、兜底文案、用户对阈值语义的理解
- **潜在风险**：不修复则高代价场景误路由；直接全量修则动类型与存量 `workflow_data`，需数据迁移

## 复现/验证路径
1. 构造 `noul ≈ 0.5` 的模糊输入跑仿真，yes/no 引脚均不命中，回退到第一条边而非人工复核。
2. A 阶段验证：文案注明“默认值，可在代码里按需调整”，阈值为具名常量。
3. B 阶段验证：Inspector 可按问题配阈值，存量老数据缺字段时回退全局默认。

## 修复方案（可选）
分两步：A（先做）阈值抽成 `DEFAULT_YES/DEFAULT_NO` 具名常量 + 文案澄清，零数据迁移；B（按需）`NoulQuestion` 加 `thresholds?: {yes, no}`，Inspector 可编辑，画布按问题级阈值渲染引脚。B 需同步把兜底从 `confidenceRange` 切到 `noul` 值区间判断。A 约 0.5 天内含，B 约 0.5-1 天。

## 评审记录
| 日期 | 评审人 | 结论 |
|------|--------|------|
| 2026-09-21 | 用户 | 确认分两步：先 A（文案+常量），B 按需排期 |
