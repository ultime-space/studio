# 03 · 测试与验收

> 定位：改 studio 时跑什么、什么算通过。
> 适用版本：0.1.x
> 关系：协议见 [`02-contract`](./02-contract.md)；发布检查见 [`04-release`](./04-release.md)。

---

## 命令

```bash
pnpm check
pnpm test
pnpm typecheck
```

## 覆盖范围

| 测试 | 保护什么 |
|---|---|
| `tests/controller.test.ts` | 状态、历史、`set` / `patch` / `reset` / 校验 |
| `tests/normalize.test.ts` | 默认值补齐、未知字段策略、迁移、字段级修正 |
| `tests/contract.test.ts` | 定义协议：字段自洽 / 默认值规范形 / 往返 / 导出确定性 |

- 新增协议字段：必须同时补契约测试与 README / `skills.md`。
- 改导出或序列化：必须有「同输入逐字节相同」的断言。
- 改 URL 编解码：必须覆盖旧版本串的兼容或明确迁移。

## 契约测试

```ts
import { assertContract } from '@ultime/studio'
await assertContract(theme)
```

领域包自己再补领域 golden 测试（同一份输入产物逐字节一致）。

## 反例

- 只测 `createConfigurator` 的 happy path：诊断分级、未知字段、迁移都没覆盖。
- 用 mock 替代真实定义：契约测试的意义就是跑真实 `fields` / `defaults` / `validate`。
