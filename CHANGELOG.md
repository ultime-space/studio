# Changelog

## 0.2.1 - 2026-11-10

- 构建改用 `vp pack`，产物同时生成 `dist/index.js` 与 `dist/index.d.ts`。
- `exports.types` 指向 `dist/index.d.ts`，包体不再包含 `src/`；安装后类型解析不依赖源码。
- 无运行时 API 变化。

## 0.2.0 - 2026-11-10

- **行为变更**：字段范围分两层——`min` / `max` 是合法域，越界给 `error` 并阻断导出（API 侧防乱传）；新增 `suggested` 建议区间，越界只给 `warn`。类型 / 枚举 / 缺失仍是 `error`。
- `hue` 明确为控件提示：运行时等同 `number`，不强制 0–360，也不隐式回绕。
- 包内新增 `llms.txt` / `SKILLS.md` 作为消费侧 AI 入口，并与 `exports` 对齐；`rules/` 留仓，操作约束并入 `AGENTS.md`。
- 协议注释与 README 同步上述口径。

## 0.1.2 - 2026-11-09

- 测试与文档领域中立化：fixture 改为通用 `theme` 配置，不再使用任何具体领域的路径或字段。
- 新增 JSON / JSON Pointer / 编解码 / 导出 lock 的 API 测试，并补包内容边界测试。
- `serialize` 文档不再绑定特定配置文件；README / rules 去掉跨包名称与发布顺序。
- `keywords` 改为通用配置器词，不再绑定特定领域。
- 补 `@types/node` 与 tsconfig `types: ["node"]`，修复 CI 中 `prepublishOnly` 的类型检查失败。

## 0.1.1 - 2026-11-04

- 仓库自带 `pnpm-lock.yaml` 并声明 `packageManager`，依赖可复现，CI 用 `--frozen-lockfile`。
- 包内补齐格式化与 lint 配置，独立仓的 `pnpm check` 与元仓口径一致。

## 0.1.0 - 2026-11-04

- 首次发布：定义协议、控制器、规范化、诊断、编解码、预览模型与导出编排。
- 零第三方运行时依赖；不依赖领域包，不做 UI 与文件 IO。
