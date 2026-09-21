---
schema_version: 1
---

# TD-2026-003: 模型名三套映射各自改写，用户选择被静默篡改

## 基本信息
| 字段 | 内容 |
|------|------|
| 发现时间 | 2026-09-21 |
| 发现人 | Muse Spark（Agent 对照官方文档核查） |
| 关联Spec | 无（源于官方 Choice/Score/Noul 文档对照评审） |
| 关联规则 | 生产级工程导向（改动可预期：禁止静默改写用户配置） |
| 优先级 | P2 |
| 状态 | 已解决 |

## 详细描述
项目中存在三套模型标识：`jev-latest` / `jev-1.13.0`（TypeSafe 原生）与 `typesafe/jev-1.13`（OpenRouter catalog），但三处各自为政：
- `src/components/Inspector/NodeInspector.tsx:117-125` 下拉只提供前两种；
- `src/utils/openRouterClient.ts:77-85` 把 `jev-*` 前缀拼接成 `typesafe/jev-*`（如 `typesafe/jev-latest` 在 catalog 中大概率不存在）；
- `src/utils/codeGenerator.ts:135` 则一刀切回退 `typesafe/jev-1.13`。
用户在 UI 选择 `jev-latest` 后经 OpenRouter 通道实际发出的 `model` 是什么，无法从界面获知。另 `src/i18n/translations.ts:48/190` 已写好 `typesafe/jev-1.13 (OpenRouter)` 文案但从未被下拉使用。

## 影响范围
- **影响文件**：`src/utils/openRouterClient.ts:77-85`、`src/utils/codeGenerator.ts:124-135`、`src/components/Inspector/NodeInspector.tsx:117-125`、`src/i18n/translations.ts:48/190`
- **影响功能**：所有 OpenRouter Live 调用与 OpenRouter 代码导出实际命中的模型
- **潜在风险**：打到不存在的模型名导致 404/400；或静默命中非预期版本导致判定分布变化与计费差异，且用户无感知

## 复现/验证路径
1. UI 选 `jev-latest`，经 OpenRouter Live 抓包，发出 `model: "typesafe/jev-latest"`（与代码导出模板硬编码的 `typesafe/jev-1.13` 不一致）。
2. 修复后复查：三个入口（Live / TS 导出 / OpenRouter 导出）对同一画布模型选择发出的 `model` 字段一致，且有显式映射提示。

## 修复方案（可选）
新建 `src/utils/modelMap.ts` 单一真相源：`jev-latest → {typesafe: jev-latest, openrouter: typesafe/jev-1.13}`、`jev-1.13.0 → {typesafe: jev-1.13.0, openrouter: typesafe/jev-1.13}`；下拉补第三项 OpenRouter 专用选项；发送前对映射做显式提示。未知模型直接报错而非回退猜测。预计 0.5 天，回归风险低。开工前需确认：未知模型是报错还是回退（倾向报错）。

## 评审记录
| 日期 | 评审人 | 结论 |
|------|--------|------|
| 2026-09-21 | 用户 | 确认修法：统一映射表 + 显式提示，不静默改写 |
