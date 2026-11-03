/**
 * preview.ts — 预览模型（不含 DOM / iframe / 设备壳）
 * ---------------------------------------------------------------------------
 * `css` 是主路径：注入整段产出 CSS，`[data-theme]` / `[data-density]` 作用域才不会被压掉；
 * `vars` 只做兼容，给只能吃 CSS 变量的宿主。宿主形态（iframe / 设备壳 / 预览页）归上游。
 */

import type { ConfiguratorDefinition } from './definition.ts'

export interface PreviewScenario {
  id: string
  label: string
  description?: string
}

export interface PreviewModel {
  /** 与导出一份源的整段 CSS */
  css?: string
  /** 兼容路径：只吃变量的宿主 */
  vars?: Record<string, string>
  scenarios?: readonly PreviewScenario[]
}

export function previewConfig<TConfig>(
  definition: ConfiguratorDefinition<TConfig>,
  config: TConfig,
): PreviewModel | undefined {
  return definition.preview?.(config)
}
