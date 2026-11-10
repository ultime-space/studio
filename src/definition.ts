/**
 * definition.ts — 领域定义协议（FieldSpec / GroupSpec / Preset / Definition）
 * ---------------------------------------------------------------------------
 * 定义包只写领域规则：字段、默认值、预设、校验、预览、导出；
 * 表单层级、控件形态、窄屏收纳归上游 UI，运行时只给元数据与状态。
 * `FieldSpec.type` 是 UI 提示；运行时只做通用的类型 / 枚举 / 范围校验。
 * `hue` 只是控件提示（色相盘），运行时等同 `number`，不强制 0–360。
 * `min` / `max` 是合法域，越界给 `error` 并阻断导出；`suggested` 是建议区间，越界只给 `warn`。
 */

import type { Awaitable, Diagnostic, ExportContext, ExportResult, ValidationContext } from './types.ts'
import type { PreviewModel } from './preview-types.ts'

export type FieldType = 'hue' | 'slider' | 'number' | 'select' | 'text' | 'color' | 'switch' | 'multi-select' | 'custom'

export interface FieldOption {
  value: string | number
  label: string
  description?: string
}

export interface Condition {
  path: string
  op: 'eq' | 'neq' | 'in' | 'truthy' | 'falsy'
  value?: unknown
}

export interface FieldSpec {
  /** JSON Pointer，如 `/theme/accent/hue` */
  path: string
  label: string
  type: FieldType
  /** 指向 GroupSpec.key */
  group?: string
  hint?: string
  optional?: boolean
  /** 合法域下限；越界给 error，阻断导出 */
  min?: number
  /** 合法域上限；越界给 error，阻断导出 */
  max?: number
  /** 建议区间；越界只给 warn，不阻断导出（审美取舍归用户） */
  suggested?: { min?: number; max?: number }
  step?: number
  unit?: string
  /** `select` / `multi-select` 必填 */
  options?: readonly FieldOption[]
  /** UI 提示：默认收起 */
  advanced?: boolean
  /** UI 提示：条件显示 */
  visibleWhen?: Condition
  /** 自定义 renderer 的附加信息；运行时只透传 */
  meta?: Record<string, unknown>
}

export interface GroupSpec {
  key: string
  label: string
  description?: string
  order?: number
  advanced?: boolean
}

export interface Preset<TConfig> {
  id: string
  label: string
  description?: string
  /** 完整配置；应用时整体替换，baseline 不变 */
  config: TConfig
}

export type UnknownPolicy = 'reject' | 'strip' | 'allow'

export interface ConfiguratorDefinition<TConfig> {
  /** 定义 id，用于诊断 code 前缀与产物元信息 */
  id: string
  title: string
  /** 配置 schema 版本，不是包版本 */
  version: string
  /** 完整默认配置：规范化时的底座 */
  defaults: TConfig
  fields: readonly FieldSpec[]
  groups?: readonly GroupSpec[]
  presets?: readonly Preset<TConfig>[]
  /** 未知字段策略；默认 reject */
  unknownPolicy?: UnknownPolicy
  /** 领域自定义规范化；在通用补默认之后执行 */
  normalize?(input: unknown): TConfig
  /** 领域校验；error 阻断导出，warn / info 不阻断 */
  validate?(config: TConfig, context: ValidationContext): Awaitable<readonly Diagnostic[]>
  /** 只读派生值，供上游展示「配置 → 派生」；不进 config、不进导出 */
  inspect?(config: TConfig): Record<string, unknown>
  /** 预览模型；必须与 export() 同源，运行时不做「近似预览」 */
  preview?(config: TConfig): PreviewModel
  export(config: TConfig, context: ExportContext): Awaitable<ExportResult>
  /** 旧版本配置升级；version 与定义不一致时调用，之后再规范化 */
  migrate?(input: unknown, fromVersion: string): TConfig
}

/** 类型帮助函数：只做类型收敛，不改变定义内容 */
export function defineConfigurator<TConfig>(
  definition: ConfiguratorDefinition<TConfig>,
): ConfiguratorDefinition<TConfig> {
  return definition
}

/** 读取字段条件；`visibleWhen` 是 UI 提示，这里给上游一个统一口径的实现 */
export function matchesCondition(read: (path: string) => unknown, condition: Condition): boolean {
  const value = read(condition.path)
  switch (condition.op) {
    case 'eq':
      return value === condition.value
    case 'neq':
      return value !== condition.value
    case 'in':
      return Array.isArray(condition.value) && condition.value.includes(value)
    case 'truthy':
      return Boolean(value)
    case 'falsy':
      return !value
  }
}
