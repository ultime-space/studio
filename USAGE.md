# 使用说明

> 定位：`@ultime/studio` 的完整用法：语义约定、契约测试、目录与命令。
> 适用版本：0.5.x
> 关系：定位与最小示例见 [README](./README.md)；AI 入口见 [`SKILLS.md`](./SKILLS.md)。

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
| `inspect()` | 只读派生值，供上游展示「配置 → 派生」；不进 config、不进导出；契约测试检查确定性与不改写配置 |
| `preview()` | `PreviewModel.css` 是主路径，必须与 `export()` 同源；`vars` 只做兼容；契约测试检查确定性与不改写配置 |
| 诊断 | `{ level, code, message, path?, hint?, fix? }`；`hint` 是下一步怎么改，`fix` 是可审阅 patch |
| `applyDiagnosticFix(config, diagnostic)` | 应用一条诊断的 patch，返回新配置、不改入参；没有 `fix` 抛 `fix/missing` |

**四条硬约束**：先规范化再导出；导出确定性（同输入逐字节相同、lock 不含时间戳）；预览与导出同源；运行时不决定布局与控件形态。

**两条实现口径**：

- 未知字段按 `unknownPolicy` 处理，只查对象键、不深入数组元素（数组整体当作一个值）。
- 配置根上 `$` 开头的键（`$schema` / `$version`）视为元信息，不参与未知字段判定；`$version` 只在导入时用于迁移。

**fix 生成口径**：缺失 → `add` 默认值；数值越界 → clamp 到 `min` / `max`；`select` 非法值 → 回落默认；`multi-select` → 只过滤非法项。目标值推不出来时不给 `fix`。契约测试核对可应用性、入参只读与「应用后同路径不再有同级诊断」。

## 契约测试

```ts
import { assertContract } from '@ultime/studio'

await assertContract(configurator)   // 字段自洽 / 默认值规范形 / 往返 / 默认值校验 / inspect·preview 确定性与只读 / 导出确定性
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
