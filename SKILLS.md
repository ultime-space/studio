# @ultime/studio · 可调用能力

> 定位：AI 可调用的协议、方法与错误语义。字段与预设内容由领域包定义，本文件不手抄。
> 适用版本：0.2.x
> 同步基线：0.2.x（手写；导出面或协议变化时同批更新）

---

## 入口

```ts
import {
  createConfigurator,
  defineConfigurator,
  exportConfig,
  normalizeConfig,
  assertContract,
} from '@ultime/studio'
```

| 能力 | 输入 | 输出 |
|---|---|---|
| `defineConfigurator(def)` | `fields` / `defaults` / `validate` / `export` | 定义对象（只声明领域规则） |
| `createConfigurator(def)` | 定义 | 有状态控制器：`set` / `patch` / `reset` / `validate` / `export` / `serialize` / `toURL` / `fromURL` / `inspect` / `preview` |
| `normalizeConfig(def, raw)` | 原始 JSON | 补默认、未知字段策略、迁移后的配置 |
| `exportConfig(def, config)` | 配置 | `ExportOutcome`（无文件 IO） |
| `assertContract(def)` | 定义 | 契约断言：字段自洽 / 默认值 / 往返 / `inspect`·`preview` 确定性与只读 / 导出确定性 |

## 错误语义

- `validate()` 返回诊断数组：类型 / 枚举 / 缺失 / `min`·`max` 合法域越界 / 领域阻断是 `error` 并阻断导出；`suggested` 建议区间与提示是 `warn` / `info`，不阻断。
- 诊断形状 `{ level, code, message, path?, hint?, fix? }`；`hint` 是下一步怎么改，`fix` 是可审阅 patch。
- `export()` 不抛异常；失败时返回 `ok: false` 与诊断。
- 未知字段按 `unknownPolicy` 处理，只查对象键、不深入数组元素。
- `$schema` / `$version` 视为元信息，不参与未知字段判定；`$version` 与定义不一致时必须有 `migrate`，否则抛 `config/version`。

## 确定性

- `serialize()` 稳定 JSON（对象键排序）；
- `export()` 同输入逐字节相同，lock 不含时间戳；
- `preview().css` 必须与 `export()` 同源。

## 反例

- 直接把 `ExportOutcome` 写盘：文件 IO 归 CLI 或上游。
- 用 `inspect()` 的值反写 config：派生值不进配置、不进导出。
