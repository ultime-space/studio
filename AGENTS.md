# AGENTS.md — @ultime/studio

> 给在本仓库工作的 AI 与协作者：入口、可写 / 只读、红线与验收。
> 适用版本：0.2.x

## 先读

1. [`README.md`](./README.md) — 协议、控制器、导出与边界。
2. [`rules/README.md`](./rules/README.md) — 本包开发规范。
3. [`llms.txt`](./llms.txt) — AI 索引；能力表见 [`SKILLS.md`](./SKILLS.md)。
4. [`src/definition.ts`](./src/definition.ts) — 定义协议；先看它再改运行时。

## 可写 / 只读

| 路径 | 条件 |
|---|---|
| `src/definition.ts` | 协议变更；必须同步所有领域包与契约测试 |
| `src/controller.ts` | 状态 / 历史 / 校验 / 导出编排 |
| `src/normalize.ts` / `src/diagnostics.ts` | 规范化与通用校验 |
| `src/persistence.ts` / `src/preview.ts` / `src/export.ts` | 纯编解码 / 预览模型 / 导出编排 |
| `tests/**` | 与改动同批 |
| `rules/` / `llms.txt` / `SKILLS.md` | 随版本同批更新 |

只读：`node_modules/**`；领域包的源码与产物（只在定义层消费，不跨包改）。

## 红线

- **本包是上游通用运行时**：只放协议与运行时；领域字段 / 默认值 / 示例 / UI 都在上层包，不进入本包。
- **不依赖领域包**：不 import 任何领域包；领域定义放各包 `/studio` 子入口。
- **不做 UI / 文件 IO**：表单、预览宿主、下载、localStorage 归上游。
- **不决定布局与控件形态**：运行时只处理配置数据。
- **导出确定性**：同输入逐字节相同，lock 不含时间戳。
- **字段是唯一 schema 载体**：不在别处维护第二份字段表。
- **不改已发布版本元数据**：版本、许可与作者信息随新版本生效。

## 验证

```bash
pnpm check
pnpm test
```

- 改协议：同步 README、`SKILLS.md`、受影响的领域包与版本戳；
- 没跑或没跑通时，必须说明是哪一条、为什么。
