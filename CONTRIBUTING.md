# Contributing

> 给贡献者与 AI 的最短协作规则。协议与用法见 [README](./README.md)。

## Git 流程

1. 从 `main` 切 `feat/<主题>` / `fix/<主题>` / `docs-<主题>`。
2. 开发完成后 `git rebase main`；一次提交一件事，提交信息用 `type(scope): subject`。
3. push 分支并开 PR；CI 必须通过，评论必须解决。
4. 用 rebase / squash 合并，删除分支；`main` 不保留中间提交。
5. 不直接 push `main`，不 force push、不删除 `main`；`main` 受保护，管理员也一样。
6. 发布按包版本打 tag，由 CI 执行；tag 规则见仓库保护设置。

## 改动规则

- 运行时只认 `ConfiguratorDefinition` 通用协议；不 import 任何领域包。
- 不做 UI、文件 IO、DOM、网络；预览与导出必须同源。
- 协议字段变更会影响所有领域包：先改 studio，再发依赖包。
- 改导出或序列化必须有「同输入逐字节相同」测试。

## Review

提交 PR 前自查五件事：

- **文档**：README / 用法 / 示例是否仍准确；链接、版本、CHANGELOG 是否同步。
- **注释**：只写为什么、约束、反直觉处；不复述代码。
- **冗余**：同一事实只有一份正文；新增说明先改真源，其他位置只留指针。
- **缺漏**：新增能力是否有入口、示例与验证命令。
- **漂移**：`package.json` / README / `CHANGELOG` / VERSION（及适用的 AI 文档）版本是否一致。

机械检查交给 CI；人审看架构、边界、语义与取舍。

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
