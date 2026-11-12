/**
 * types.ts — 运行时公共数据形状（纯类型，零依赖）
 * ---------------------------------------------------------------------------
 * 配置必须是纯 JSON：可序列化、可 path 寻址、可做版本迁移；不接受 class / 函数。
 * 这里只放「定义包与上游 UI 都要认」的结构，不放任何领域语义。
 */

export type Awaitable<T> = T | Promise<T>

/** 产物：路径相对输出根，分隔符统一用 `/` */
export interface Artifact {
  path: string
  content: string
}

/** 产物摘要：只记 hash，不记时间戳（否则每次构建都漂） */
export interface LockSummary {
  configHash: string
  artifacts: Record<string, string>
}

export interface ExportResult {
  files: Artifact[]
  lock?: LockSummary
}

export type DiagnosticLevel = 'error' | 'warn' | 'info'

/** 修复建议也是一段 patch：可预览、可审阅，不是黑盒操作 */
export interface DiagnosticFix {
  label: string
  patch: ConfigPatch
}

export interface Diagnostic {
  level: DiagnosticLevel
  code: string
  message: string
  /** 字段锚点，JSON Pointer */
  path?: string
  /** 可执行的修复说明；比 message 更接近「下一步做什么」 */
  hint?: string
  fix?: DiagnosticFix
}

export interface ExportOutcome {
  ok: boolean
  files: Artifact[]
  diagnostics: readonly Diagnostic[]
  lock?: LockSummary
}

export interface ConfigPatchOperation {
  op: 'add' | 'remove' | 'replace'
  /** JSON Pointer，如 `/theme/accent/hue` */
  path: string
  value?: unknown
}

export type ConfigPatch = readonly ConfigPatchOperation[]

export interface ValidationContext {
  mode: 'edit' | 'export'
}

export interface ExportContext {
  /** 只导出指定产物；省略 = 定义包的默认清单 */
  include?: readonly string[]
}
