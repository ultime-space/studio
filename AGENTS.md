# AGENTS.md — @ultime/studio

> 给在本仓库工作的 AI 与协作者：只放入口与红线，不复述 README。
> 适用版本：0.1.x

## 先读

1. [`README.md`](./README.md) — 协议、控制器、导出与边界。
2. [`rules/README.md`](./rules/README.md) — 本包开发规范。
3. [`llms.txt`](./llms.txt) — AI 索引；能力表见 [`skills.md`](./skills.md)，操作约束见 [`agent.md`](./agent.md)。
4. [`src/definition.ts`](./src/definition.ts) — 定义协议；先看它再改运行时。

## 红线

- **不依赖领域包**：不 import 任何领域包；领域定义放各包 `/studio` 子入口。
- **不做 UI / 文件 IO**：表单、预览宿主、下载、localStorage 归上游。
- **不决定布局与控件形态**：运行时只处理配置数据。
- **导出确定性**：同输入逐字节相同，lock 不含时间戳。
- **字段是唯一 schema 载体**：不在别处维护第二份字段表。

## 验证

```bash
pnpm check
pnpm test
pnpm typecheck
```

没跑或没跑通时，必须说明是哪一条、为什么。
