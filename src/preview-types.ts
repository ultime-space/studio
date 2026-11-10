/**
 * preview-types.ts — 预览模型类型
 * ---------------------------------------------------------------------------
 * 单独放类型，避免 definition ↔ preview 的类型循环依赖。
 */

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
