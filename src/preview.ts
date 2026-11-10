/**
 * preview.ts — 预览模型（不含 DOM / iframe / 设备壳）
 * ---------------------------------------------------------------------------
 * `css` 是主路径：注入整段产出 CSS，`[data-theme]` / `[data-density]` 作用域才不会被压掉；
 * `vars` 只做兼容，给只能吃 CSS 变量的宿主。宿主形态（iframe / 设备壳 / 预览页）归上游。
 */

import type { ConfiguratorDefinition } from './definition.ts'
import type { PreviewModel } from './preview-types.ts'

export type { PreviewModel, PreviewScenario } from './preview-types.ts'

export function previewConfig<TConfig>(
  definition: ConfiguratorDefinition<TConfig>,
  config: TConfig,
): PreviewModel | undefined {
  return definition.preview?.(config)
}
