# 04 · 版本与发布

> 定位：studio 的编译 ESM 形态、发布顺序与检查。
> 适用版本：0.3.x
> 关系：测试见 [`03-testing`](./03-testing.md)；发布由仓库 owner 按本清单执行。

---

## 形态

- **编译 ESM**：`exports` 的 `import` 指向 `dist/index.js`，由 `vp pack` 生成；类型来自 `dist/index.d.ts`，包体不含 `src`。
- `engines.node >= 22.18`；浏览器侧需要打包器。
- 零第三方运行时依赖。

## 顺序

先发 `@ultime/studio`，再由依赖它的领域包各自发布；顺序由各自仓库执行。

## 发布前检查

- [ ] `pnpm check` / `pnpm test` 全绿
- [ ] `npm pack --dry-run` 只带 `dist` / `README.md` / `llms.txt` / `SKILLS.md` / 附属文件（不含 `tests/` / `rules/` / `evals` / `src`）
- [ ] `package.json` 版本、tag、`CHANGELOG.md` 一致
- [ ] 协议字段或行为变化写进 README「版本与兼容」
- [ ] 包级 AI 文档与代码一致：`rules/` / `llms.txt` / `SKILLS.md` / `AGENTS.md` 的版本戳与能力表已更新
- [ ] 包内配套设施：`npm pack --dry-run` 含 `llms.txt` / `SKILLS.md`，且与 `exports` 对齐

## 兼容

- 0.x 阶段协议仍可能调整；破坏性变更写进 README 并升 minor。
- 定义协议变更会影响所有领域包，先发 studio，再发依赖包。

## 反例

- 改了 `ConfiguratorDefinition` 却没通知领域包：所有 `/studio` 子入口同时失效。
