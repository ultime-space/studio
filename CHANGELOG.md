# Changelog

## 0.1.2 - 2026-11-09

- 测试与文档领域中立化：fixture 改为通用 `theme` 配置，不再使用任何具体领域的路径或字段。
- 新增 JSON / JSON Pointer / 编解码 / 导出 lock 的 API 测试，并补包内容边界测试。
- `serialize` 文档不再绑定特定配置文件；README / rules 去掉跨包名称与发布顺序。
- `keywords` 改为通用配置器词，不再绑定特定领域。

## 0.1.1 - 2026-11-04

- 仓库自带 `pnpm-lock.yaml` 并声明 `packageManager`，依赖可复现，CI 用 `--frozen-lockfile`。
- 包内补齐格式化与 lint 配置，独立仓的 `pnpm check` 与元仓口径一致。

## 0.1.0 - 2026-11-04

- 首次发布：定义协议、控制器、规范化、诊断、编解码、预览模型与导出编排。
- 零第三方运行时依赖；不依赖领域包，不做 UI 与文件 IO。
