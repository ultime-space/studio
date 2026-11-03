/**
 * errors.ts — 运行时错误（配置 / 定义 / 编解码）
 * ---------------------------------------------------------------------------
 * 一律同步抛出：调用方（UI / CLI / AI）能立即拿到可定位的 `code` 与 `path`。
 * 诊断不在这里：字段与领域校验走 Diagnostic，只有「根本读不懂输入」才抛错。
 */

export type StudioErrorCode =
  | 'config/type'
  | 'config/json'
  | 'config/version'
  | 'config/unknown-field'
  | 'config/not-json'
  | 'pointer/invalid'
  | 'patch/invalid'
  | 'preset/missing'
  | 'share/invalid'

export class StudioError extends Error {
  readonly code: StudioErrorCode
  /** 出错的 JSON Pointer；与具体字段无关时为空 */
  readonly path?: string

  constructor(code: StudioErrorCode, message: string, path?: string) {
    super(message)
    this.name = 'StudioError'
    this.code = code
    this.path = path
  }
}
