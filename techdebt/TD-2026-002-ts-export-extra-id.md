---
schema_version: 1
---

# TD-2026-002: TypeScript 导出 questions 多带 id 字段

## 基本信息
| 字段 | 内容 |
|------|------|
| 发现时间 | 2026-09-21 |
| 发现人 | Muse Spark（Agent 对照官方文档核查） |
| 关联Spec | 无（源于官方 Choice/Score/Noul 文档对照评审） |
| 关联规则 | 生产级工程导向（契约最小化：只发官方定义的字段） |
| 优先级 | P2 |
| 状态 | 已确认 |

## 详细描述
官方 API 的 `questions` 为 `{<id>: {type, instructions, criteria}}` 映射，`id` 只是外层 key，value 只收三个字段。`src/utils/codeGenerator.ts:91-92` 用 `questionsObj[q.id] = q` 把含 `id/type/instructions/criteria` 的完整前端对象直接序列化进 TS 导出代码的请求体，属于脏契约。目前模型侧大概率忽略多余字段所以未炸，但官方一旦收紧校验即 400。Python 导出已正确剥离 `id`，TS 导出与之不一致。

## 影响范围
- **影响文件**：`src/utils/codeGenerator.ts:89-92`（`generateTypeScriptCode`）
- **影响功能**：所有经“TypeScript / Node.js”页签导出的生产代码发出的请求体形状
- **潜在风险**：官方收紧 schema 校验后批量 400；用户复制导出代码即继承脏契约

## 复现/验证路径
1. 画布放一个 batch（含 choice/score/noul 各一），打开导出弹窗切 TypeScript 页签。
2. 可见 `questions` 内每个 value 均含 `"id": "<qid>"`。
3. 修复后复查：value 仅含 `type/instructions/criteria`（Noul 无 criteria 时省略，见 TD-2026-001），与 Python 导出形状一致。

## 修复方案（可选）
```ts
const { id, ...rest } = q as any;
questionsObj[q.id] = { type: rest.type, instructions: rest.instructions, ...(rest.criteria !== undefined ? { criteria: rest.criteria } : {}) };
```
预计 10 分钟，回归风险极低。

## 评审记录
| 日期 | 评审人 | 结论 |
|------|--------|------|
| 2026-09-21 | 用户 | 确认修法：剥离 id，只发三字段 |
