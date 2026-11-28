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

## 文档

| 文件 | 回答什么 |
|---|---|
| 本页 | 定位、安装、入口、三层分工与快速用法 |
| [USAGE](./USAGE.md) | 语义约定、契约测试、目录与命令 |
| [SKILLS](./SKILLS.md) | AI 可调用的入口与类型 |
| [llms.txt](./llms.txt) | AI 索引：能力、入口与文档路由 |

## 边界

- **不做 UI**：表单控件、预览 iframe、设备壳、下载、草稿存储都归上游。
- **不做领域规则**：字段与预设内容、对比度、依赖闭包由定义包提供。
- **不依赖领域包**：本包只认 `ConfiguratorDefinition` 这类通用协议。
- **不做文件 IO**：读盘 / 写盘在 CLI 或上游，运行时只处理字符串与对象。

## 版本与兼容

- 0.5.0：通用诊断带 `fix`（缺失补默认值、越界 clamp、非法枚举过滤），新增 `applyDiagnosticFix`；契约测试补 fix 的可应用性与入参只读检查。
- 0.4.2：包内脚本改用 `vp run` 入口，去掉对 pnpm 二进制的硬依赖；协议与运行时不变。
- 0.4.1：README 改为入口卡，语义约定与命令细节下沉到 [USAGE.md](./USAGE.md)；协议与运行时不变。
- 当前 `0.5.x`；0.x 阶段 `ConfiguratorDefinition` 仍可能调整。
- 0.4.0：补诊断契约测试；无运行时行为变化。
- 0.3.1：`$version` 参与迁移并从配置剥离；JSON Pointer 严格校验数组下标；`applyPatch` 拒绝未知 op；重复产物路径返回 error 诊断。
- 0.3.0：诊断新增 `hint`，契约测试补 `inspect` / `preview` 的确定性与只读检查；协议形状只增不改。
- 破坏性变更写进 [CHANGELOG](./CHANGELOG.md)，并在本节目说明迁移方式；协议变更先发 studio，再发依赖包。
- 零第三方运行时依赖。

## 许可

MIT，见 [LICENSE](./LICENSE)。
