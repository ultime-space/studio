# studio · 开发规则

> 定位：本包开发规范的索引。只写判断、边界与反例；协议与 API 以 README 和 `src/definition.ts` 为准。
> 适用版本：0.3.x
> owner：维护者（repo owner）· 复核：2026-11-11 · 到期降级为参考
> 关系：入口见 [`AGENTS.md`](../AGENTS.md)；怎么用见 [`README.md`](../README.md)。

---

## 规则清单

| 文件 | 回答什么 |
|---|---|
| [01-architecture](./01-architecture.md) | 三层分工、依赖方向、目录职责 |
| [02-contract](./02-contract.md) | 定义协议、字段、诊断、导出与确定性 |
| [03-testing](./03-testing.md) | 契约测试、控制器与编解码回归 |
| [04-release](./04-release.md) | TS 直发、发布检查、AI 文档同步 |

## 一句话

studio 是**无头运行时**：状态、规范化、诊断、编解码、预览模型、导出编排；领域规则与 UI 都不在这里。
