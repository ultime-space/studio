/**
 * index.ts — 无头运行时入口
 * ---------------------------------------------------------------------------
 * 只用纯 TS：无 DOM、无框架、无文件系统，因此浏览器 / Node / CLI / AI 都能跑同一套逻辑。
 * 领域定义在各自包的 `/studio` 入口，本包不认识 core / config / kit / viewer。
 */

export type {
  Artifact,
  Awaitable,
  ConfigPatch,
  ConfigPatchOperation,
  Diagnostic,
  DiagnosticFix,
  DiagnosticLevel,
  ExportContext,
  ExportOutcome,
  ExportResult,
  LockSummary,
  ValidationContext,
} from './types.ts'

export type { StudioErrorCode } from './errors.ts'
export { StudioError } from './errors.ts'

export { deepEqual, findNonJsonPath, isPlainObject, stableStringify } from './json.ts'

export { applyPatch, diffPaths, getAt, isPointer, joinPointer, parsePointer, removeAt, setAt } from './pointer.ts'

export type {
  Condition,
  ConfiguratorDefinition,
  FieldOption,
  FieldSpec,
  FieldType,
  GroupSpec,
  Preset,
  UnknownPolicy,
} from './definition.ts'
export { defineConfigurator, matchesCondition } from './definition.ts'

export type { NormalizeOptions } from './normalize.ts'
export { coerceFieldValue, normalizeConfig } from './normalize.ts'

export { fieldDiagnostics, hasErrors, sortDiagnostics, validateConfig } from './diagnostics.ts'

export type { ConfiguratorController, ConfiguratorOptions, ConfiguratorState, ResetOptions } from './controller.ts'
export { createConfigurator } from './controller.ts'

export type { PreviewModel, PreviewScenario } from './preview.ts'
export { previewConfig } from './preview.ts'

export { createLock, exportConfig, hashText } from './export.ts'

export {
  DEFAULT_SHARE_KEY,
  SHARE_PREFIX,
  decodeShare,
  decodeURL,
  deserializeConfig,
  encodeShare,
  encodeURL,
  serializeConfig,
} from './persistence.ts'

export type { ContractIssue, ContractOptions, ContractReport } from './testing.ts'
export { assertContract, checkContract } from './testing.ts'
