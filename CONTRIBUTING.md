# Contributing

> 给贡献者与 AI 的最短协作规则。协议与用法见 [README](./README.md)。

## 工作流

1. 从 `main` 切 `feat/<主题>` / `fix/<主题>`。
2. 完成后 `git rebase main` 再合并；主分支不保留中间提交。
3. 一次提交一件事，提交信息用 `type(scope): subject`。

## 改动规则

- 运行时只认 `ConfiguratorDefinition` 通用协议；不 import 任何领域包。
- 不做 UI、文件 IO、DOM、网络；预览与导出必须同源。
- 协议字段变更会影响所有领域包：先改 studio，再发依赖包。
- 改导出或序列化必须有「同输入逐字节相同」测试。

## 验证

```bash
pnpm check
pnpm test
pnpm typecheck
npm pack --dry-run
```

## 版本

- 0.x 阶段协议仍可能调整；破坏性变更写进 README「版本与兼容」。
- 协议变更先发 studio，再发依赖它的领域包。
