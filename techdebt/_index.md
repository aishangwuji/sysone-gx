# 技术债索引（免读取扫描）

> 读取本文件即可掌握全局状态，无需逐个打开详情。正文状态流转时须在同一提交中同步更新本表。

| ID | 状态 | 一句话标题 |
|----|------|-----------|
| TD-2026-001 | 已确认 | Noul 无 criteria 时硬塞默认 true/false 文案（`openRouterClient.ts`） |
| TD-2026-002 | 已确认 | TS 导出 questions 多带 id 字段（`codeGenerator.ts`） |
| TD-2026-003 | 已确认 | 模型名三套映射静默改写用户选择（`openRouterClient` / `codeGenerator` / `NodeInspector`） |
| TD-2026-004 | 已确认 | Noul 阈值 0.7/0.3 写死，分两步修（先常量+文案，后按问题可配） |
| TD-2026-005 | 已确认 | 推测式问题拆两次调用，补一键合并操作（不动默认模板） |
| TD-2026-006 | 已确认 | 后端缺 workflow_data 形状校验，分两步修（先纯校验，代理暂缓） |

来源：2026-09-21 官方 Choice/Score/Noul 文档对照评审（中低风险 6 项）。高风险项（Noul 无 confidence 兜底、state 二次包装、Score 仿真置信写死、EntryType/UI 有损往返）尚未建债，待确认修法后另起编号。
