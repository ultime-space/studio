# 01 · 架构与依赖

> 定位：studio 的三层分工、依赖方向与目录职责。
> 适用版本：0.1.x
> 关系：规则索引见 [`README`](./README.md)；协议细节见 [`02-contract`](./02-contract.md)。

---

## 三层分工

| 层 | 谁写 | 内容 |
|---|---|---|
| 运行时 | 本包 | 状态、规范化、诊断、编解码、预览模型、导出编排、契约测试 |
| 领域定义 | 各包 `src/studio/` | `fields` / `defaults` / `presets` / `validate` / `inspect` / `preview` / `export` |
| UI | 上游自建 | 表单、预览宿主、下载、localStorage、剪贴板 |

## 依赖方向

```text
UI / CLI / AI → @ultime/studio
                     ▲
领域包 /studio ──────┘（只实现定义协议）
```

- 本包**不 import** `core` / `kit` / `viewer`。
- 领域包依赖本包，不反向。
- 只通过公开入口依赖，不跨包读源码。

## 目录

| 路径 | 职责 |
|---|---|
| `src/definition.ts` | 定义协议 / FieldSpec / GroupSpec / Preset / 条件 |
| `src/controller.ts` | `createConfigurator`：状态 / 历史 / 校验 / 导出 |
| `src/normalize.ts` | 补默认 / 未知字段策略 / 字段级修正 / 迁移入口 |
| `src/diagnostics.ts` | 通用字段校验 / 分级 / 排序 |
| `src/persistence.ts` | JSON / 分享串 / URL hash 的纯编解码 |
| `src/preview.ts` | 预览模型（不含 DOM） |
| `src/export.ts` | 导出编排 / 产物 lock / hash |
| `src/pointer.ts` | JSON Pointer 与 patch |
| `src/json.ts` | 克隆 / 稳定序列化 / 等值 / 纯 JSON 检查 |
| `src/testing.ts` | adapter 契约测试 |

## 反例

- 为方便在 studio 里 import core 的 seed 类型 —— 领域类型归 core 的 `/studio` 子入口。
- 在运行时里读取 `localStorage` 存草稿 —— 持久化只做纯字符串编解码。
