# studio

**配置器无头运行时**：把「配置怎么表达、怎么改、怎么校验、怎么导出」从 UI 里抽出来。
纯 TS、零依赖、不碰 DOM / 框架 / 文件系统；上游用 Vue / React / 原生 HTML / CLI / AI 都可以，只要操作同一份配置数据。

[![license](https://img.shields.io/badge/license-MIT-black)](./LICENSE)
[![node](https://img.shields.io/badge/node-%3E%3D22.18-black)](./package.json)

## 安装

```bash
pnpm add @ultime/studio
```

- 运行环境 Node >= 22.18，或任何支持 ESM 的打包器（Vite / esbuild 等）；包发的是编译后的 ESM（`dist/`），类型来自 `dist/*.d.ts`。
- `dist/*.js` 默认压缩；类型与声明保持可读，注释与说明留在源码与文档。
- 本包**不 import** 任何领域包；领域定义放在各包的 `/studio` 子入口，本包只认通用协议。

## 入口

| 入口 | 内容 |
|---|---|
| `@ultime/studio` | 定义协议、控制器、规范化、诊断、编解码、预览模型、导出清单、契约测试 |

领域定义不在这里：各领域包自行提供 `/studio` 子入口，本包只认通用协议。

AI 入口：[`llms.txt`](./llms.txt)（路由）与 [`SKILLS.md`](./SKILLS.md)（能力表）随包发布。

## 三层分工

| 层 | 谁写 | 内容 |
|---|---|---|
| 运行时 | 本包 | 状态、规范化、诊断、编解码、预览模型、导出编排、契约测试 |
| 领域定义 | 各包 `src/studio/` | `fields` / `defaults` / `presets` / `validate` / `inspect` / `preview` / `export` |
| UI | 上游自建 | 表单、预览宿主、下载、localStorage、剪贴板 |

## 快速用法

```ts
import { createConfigurator, defineConfigurator, exportConfig, normalizeConfig } from '@ultime/studio'

// 定义包：只声明领域规则
const configurator = defineConfigurator({
  id: 'demo',
  title: '示例配置',
  version: '1.0.0',
  defaults,             // 完整默认配置
  fields,               // FieldSpec[]，path 用 JSON Pointer
  validate(config, ctx) { /* 领域规则 */ return [] },
  export(config) { return { files: [{ path: 'output.css', content }] } },
})

// 有状态编辑：给上游表单用
const studio = createConfigurator(configurator)
studio.set('/theme/accent/hue', 210)
const diagnostics = await studio.validate()
const outcome = await studio.export()     // error 阻断时 ok: false，不抛异常

// 无状态直出：CLI / AI / 一次性导出
const config = normalizeConfig(configurator, rawJson)
const direct = await exportConfig(configurator, config)
```

## 语义约定

| 项 | 约定 |
|---|---|
| `fields` | 唯一 schema 载体；`type` 只是 UI 提示，运行时只做通用类型 / 枚举 / 范围校验 |
| `hue` | 只是控件提示（色相盘）；运行时等同 `number`，不强制 0–360，也不隐式回绕 |
| `min` / `max` | 合法域；越界给 `error` 并阻断导出（防乱传导致产物不可用） |
| `suggested` | 建议区间；越界只给 `warn`，不阻断导出 —— 风格好不好看由用户决定 |
| `custom` | 通用校验跳过，语义交给定义的 `validate()` |
| `set(path, value)` | 只改一个 JSON Pointer，做字段级取值修正；不自动重算诊断 |
| `patch(patch)` | `add` / `remove` / `replace` 子集；AI 与诊断 fix 都产出 patch，可审阅 |
| `replace` / `applyPreset` | 整体替换 config，baseline 不变 |
| `reset` | 默认回 baseline；`mode: 'defaults'` 回定义默认值；带 `path` 只复位一个字段 |
| `validate()` | 通用字段校验 + 定义 `validate()`；类型 / 枚举 / 缺失 / 合法域越界 / 领域阻断给 `error`，建议类给 `warn` / `info` |
| `export()` | 规范化 → 校验 → 定义 `export()`；返回 `ExportOutcome`，无文件 IO / 下载 |
| `serialize()` | 稳定 JSON（对象键排序），可直接落项目配置（字段由定义包决定），不含派生值 |
| `toURL()` / `fromURL()` | 纯编解码，`#studio=v1.…`，版本随串走；不依赖 `btoa` / `Buffer` / localStorage |
| `inspect()` | 只读派生值，供上游展示「配置 → 派生」；不进 config、不进导出 |
| `preview()` | `PreviewModel.css` 是主路径，必须与 `export()` 同源；`vars` 只做兼容 |

**四条硬约束**：先规范化再导出；导出确定性（同输入逐字节相同、lock 不含时间戳）；预览与导出同源；运行时不决定布局与控件形态。

**两条实现口径**：

- 未知字段按 `unknownPolicy` 处理，只查对象键、不深入数组元素（数组整体当作一个值）。
- 配置根上 `$` 开头的键（`$schema` / `$version`）视为元信息，不参与未知字段判定；`$version` 只在导入时用于迁移。

## 契约测试

```ts
import { assertContract } from '@ultime/studio'

await assertContract(configurator)   // 字段自洽 / 默认值规范形 / 往返 / 默认值校验 / 导出确定性
```

定义包自己再补领域 golden 测试（同一份输入产物逐字节一致）。

## 目录

```text
src/
  definition.ts    定义协议 / FieldSpec / GroupSpec / Preset / 条件
  controller.ts    createConfigurator：状态 / 历史 / 校验 / 导出
  normalize.ts     补默认 / 未知字段策略 / 字段级修正 / 迁移入口
  diagnostics.ts   通用字段校验 / 分级 / 排序
  persistence.ts   JSON / 分享串 / URL hash 的纯编解码
  preview.ts       预览模型（不含 DOM）
  export.ts        导出编排 / 产物 lock / hash
  pointer.ts       JSON Pointer 与 patch 应用
  json.ts          克隆 / 稳定序列化 / 等值 / 纯 JSON 检查
  testing.ts       adapter 契约测试
  types.ts         公共数据形状
tests/
```

## 命令

```bash
pnpm test
```

## 边界

- **不做 UI**：表单控件、预览 iframe、设备壳、下载、草稿存储都归上游。
- **不做领域规则**：字段与预设内容、对比度、依赖闭包由定义包提供。
- **不依赖领域包**：本包只认 `ConfiguratorDefinition` 这类通用协议。
- **不做文件 IO**：读盘 / 写盘在 CLI 或上游，运行时只处理字符串与对象。

## 版本与兼容

- 当前 `0.2.x`；0.x 阶段 `ConfiguratorDefinition` 仍可能调整。
- 破坏性变更写进 [CHANGELOG](./CHANGELOG.md)，并在本节目说明迁移方式；协议变更先发 studio，再发依赖包。
- 零第三方运行时依赖。

## 许可

MIT，见 [LICENSE](./LICENSE)。
