# 02 · 定义协议与确定性

> 定位：定义协议、字段校验、诊断与导出的稳定口径。
> 适用版本：0.2.x
> 关系：架构见 [`01-architecture`](./01-architecture.md)；测试见 [`03-testing`](./03-testing.md)。

---

## 定义协议

- `fields` 是**唯一 schema 载体**；`type` 只是 UI 提示，运行时只做通用类型 / 枚举 / 范围校验。`min` / `max` 是合法域（越界 error），`suggested` 是建议区间（越界 warn）。
- `custom` 字段跳过通用校验，语义交给定义的 `validate()`。
- 配置根上 `$` 开头的键（`$schema` / `$version`）是元信息，不参与未知字段判定；`$version` 只在导入时用于迁移。

## 状态操作

| 方法 | 约定 |
|---|---|
| `set(path, value)` | 只改一个 JSON Pointer，做字段级修正；不自动重算诊断 |
| `patch(patch)` | `add` / `remove` / `replace` 子集；AI 与诊断 fix 都产出 patch，可审阅 |
| `replace` / `applyPreset` | 整体替换 config，baseline 不变 |
| `reset` | 回 baseline；`mode: 'defaults'` 回定义默认值；带 `path` 只复位一个字段 |
| `validate()` | 通用字段校验 + 定义 `validate()`；类型 / 枚举 / 缺失 / 合法域越界 / 领域阻断给 `error`，建议区间与提示给 `warn` / `info` |
| `export()` | 规范化 → 校验 → 定义 `export()`；返回 `ExportOutcome`，无文件 IO |
| `serialize()` | 稳定 JSON（对象键排序），可直接落配置；不含派生值 |
| `toURL()` / `fromURL()` | 纯编解码，版本随串走；不依赖 `btoa` / `Buffer` / localStorage |
| `inspect()` | 只读派生值；不进 config、不进导出 |
| `preview()` | `PreviewModel.css` 是主路径，必须与 `export()` 同源 |

## 四条硬约束

1. 先规范化再导出；
2. 导出确定性：同输入逐字节相同、lock 不含时间戳；
3. 预览与导出同源；
4. 运行时不决定布局与控件形态。

## 反例

- 在 `set()` 里顺手重算诊断：调用方无法控制节奏，历史与 patch 也会失真。
- `preview()` 自己拼一套 CSS：与导出不同源，预览通过不代表导出可用。
