# @ultime/studio · 操作约束

> 定位：AI 在本仓可以改什么、不能改什么、改完怎么验。
> 适用版本：0.1.x

---

## 可写

| 路径 | 条件 |
|---|---|
| `src/definition.ts` | 协议变更；必须同步所有领域包与契约测试 |
| `src/controller.ts` | 状态 / 历史 / 校验 / 导出编排 |
| `src/normalize.ts` / `src/diagnostics.ts` | 规范化与通用校验 |
| `src/persistence.ts` / `src/preview.ts` / `src/export.ts` | 纯编解码 / 预览模型 / 导出编排 |
| `tests/**` | 与改动同批 |
| `rules/` / `llms.txt` / `skills.md` / `agent.md` | 随版本同批更新 |

## 只读

- `node_modules/**`；
- 领域包（core / kit / viewer）的源码与产物；只在定义层消费，不跨包改。

## 禁止

- import `core` / `kit` / `viewer` 或任何领域包；
- 读写文件、访问 DOM、`localStorage`、网络；
- 在运行时决定布局与控件形态；
- 在 `set()` 里自动重算诊断；
- 让 `preview()` 维护与 `export()` 不同源的 CSS；
- 改已发布版本的元数据。

## 验证

```bash
pnpm check
pnpm test
pnpm typecheck
```

- 改协议：同步 README、`skills.md`、受影响的领域包与版本戳；
- 交付时说明跑了哪些命令；没跑或失败要写清哪一条、为什么。
