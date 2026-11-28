/**
 * diagnostics.ts — 通用字段校验、修复建议与诊断排序
 * ---------------------------------------------------------------------------
 * 运行时只做通用的类型 / 枚举 / 范围校验；对比度、依赖闭包这类领域规则由定义的 validate() 提供。
 * `error` 阻断导出，`warn` / `info` 只提示；诊断带 path，上游据此定位到字段。
 * 范围分两层：`min` / `max` 是合法域（越界 error），`suggested` 是建议区间（越界 warn）。
 * `fix` 只在目标值可推导时给出：默认值、clamp 到边界、过滤非法枚举项；其余留给 hint。
 */

import type { ConfiguratorDefinition, FieldSpec } from './definition.ts'
import { StudioError } from './errors.ts'
import { applyPatch, getAt } from './pointer.ts'
import type { Diagnostic, DiagnosticFix, DiagnosticLevel, ValidationContext } from './types.ts'

const WEIGHT: Record<DiagnosticLevel, number> = { error: 0, warn: 1, info: 2 }

function isMissing(value: unknown): boolean {
  return value === undefined || value === null
}

function isOptionValue(field: FieldSpec, value: unknown): boolean {
  return (field.options ?? []).some((option) => option.value === value)
}

function describeValue(value: unknown): string {
  return typeof value === 'string' ? `「${value}」` : `${JSON.stringify(value)}`
}

/** 只读定位默认值；默认值缺失时不编造修复目标 */
function defaultValueAt<TConfig>(definition: ConfiguratorDefinition<TConfig>, path: string): unknown {
  return getAt(definition.defaults, path)
}

function fixAdd(path: string, value: unknown, label: string): DiagnosticFix {
  return { label, patch: [{ op: 'add', path, value }] }
}

function fixReplace(path: string, value: unknown, label: string): DiagnosticFix {
  return { label, patch: [{ op: 'replace', path, value }] }
}

function checkField<TConfig>(
  definition: ConfiguratorDefinition<TConfig>,
  field: FieldSpec,
  value: unknown,
): Diagnostic[] {
  const at = field.path
  const fallback = defaultValueAt(definition, at)
  const push = (
    code: string,
    message: string,
    level: DiagnosticLevel = 'error',
    hint?: string,
    fix?: DiagnosticFix,
  ): Diagnostic => ({
    level,
    code: `field/${code}`,
    message: `${field.label}：${message}`,
    path: at,
    ...(hint === undefined ? {} : { hint }),
    ...(fix === undefined ? {} : { fix }),
  })
  const restore = (): DiagnosticFix | undefined =>
    fallback === undefined ? undefined : fixReplace(at, fallback, `恢复默认值 ${describeValue(fallback)}`)

  if (isMissing(value)) {
    if (field.optional) return []
    const fix = fallback === undefined ? undefined : fixAdd(at, fallback, `填入默认值 ${describeValue(fallback)}`)
    return [push('missing', '必填项缺失', 'error', '填写该字段，或把字段标为 optional', fix)]
  }

  switch (field.type) {
    case 'number':
    case 'slider':
    case 'hue': {
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        return [push('type', '应为数字', 'error', '改为数字', restore())]
      }
      const bounds = `${field.min ?? '−∞'}–${field.max ?? '∞'}`
      const hard: Diagnostic[] = []
      if (field.min !== undefined && value < field.min) {
        hard.push(
          push(
            'range',
            `不得小于 ${field.min}`,
            'error',
            `调整到 ${bounds}`,
            fixReplace(at, field.min, `收敛到下限 ${field.min}`),
          ),
        )
      }
      if (field.max !== undefined && value > field.max) {
        hard.push(
          push(
            'range',
            `不得大于 ${field.max}`,
            'error',
            `调整到 ${bounds}`,
            fixReplace(at, field.max, `收敛到上限 ${field.max}`),
          ),
        )
      }
      if (hard.length) return hard

      const advice: Diagnostic[] = []
      const suggested = field.suggested
      if (suggested?.min !== undefined && value < suggested.min) {
        advice.push(
          push('suggested', `建议不小于 ${suggested.min}`, 'warn', `参考区间 ${suggested.min}–${suggested.max ?? '∞'}`),
        )
      }
      if (suggested?.max !== undefined && value > suggested.max) {
        advice.push(
          push(
            'suggested',
            `建议不大于 ${suggested.max}`,
            'warn',
            `参考区间 ${suggested.min ?? '−∞'}–${suggested.max}`,
          ),
        )
      }
      return advice
    }
    case 'switch':
      return typeof value === 'boolean' ? [] : [push('type', '应为布尔值', 'error', '改为 true / false', restore())]
    case 'text':
    case 'color':
      return typeof value === 'string' ? [] : [push('type', '应为字符串', 'error', '改为字符串', restore())]
    case 'select': {
      if (isOptionValue(field, value)) return []
      const fix = isOptionValue(field, fallback) ? restore() : undefined
      return [push('enum', '取值不在选项内', 'error', '从 options 中选一个', fix)]
    }
    case 'multi-select': {
      if (!Array.isArray(value)) {
        const fix = Array.isArray(fallback) ? restore() : undefined
        return [push('type', '应为数组', 'error', '改为数组', fix)]
      }
      const invalid = value.filter((item) => !isOptionValue(field, item))
      if (!invalid.length) return []
      const kept = value.filter((item) => isOptionValue(field, item))
      return [
        push(
          'enum',
          `取值不在选项内：${invalid.join('、')}`,
          'error',
          '移除不在 options 中的取值',
          fixReplace(at, kept, `移除 ${invalid.length} 个非法取值`),
        ),
      ]
    }
    case 'custom':
      return []
  }
}

/** 通用字段校验；`custom` 字段跳过，语义交给定义的 validate() */
export function fieldDiagnostics<TConfig>(definition: ConfiguratorDefinition<TConfig>, config: TConfig): Diagnostic[] {
  return definition.fields.flatMap((field) => checkField(definition, field, getAt(config, field.path)))
}

/**
 * 应用一条诊断的 fix：返回新配置，不改传入对象。
 * 没有 fix 或 patch 非法都抛错，调用方不用自己判断能不能应用。
 */
export function applyDiagnosticFix<TConfig>(config: TConfig, diagnostic: Diagnostic): TConfig {
  if (!diagnostic.fix) {
    throw new StudioError('fix/missing', `诊断 ${diagnostic.code} 没有可应用的 fix`, diagnostic.path)
  }
  return applyPatch(config, diagnostic.fix.patch)
}

/** 排序口径：先按 path，再按级别，最后按 code；保证同一份输入诊断顺序稳定 */
export function sortDiagnostics(diagnostics: readonly Diagnostic[]): Diagnostic[] {
  return [...diagnostics].sort((a, b) => {
    const pathA = a.path ?? ''
    const pathB = b.path ?? ''
    if (pathA !== pathB) return pathA < pathB ? -1 : 1
    if (a.level !== b.level) return WEIGHT[a.level] - WEIGHT[b.level]
    return a.code < b.code ? -1 : a.code > b.code ? 1 : 0
  })
}

export function hasErrors(diagnostics: readonly Diagnostic[]): boolean {
  return diagnostics.some((item) => item.level === 'error')
}

/** 通用字段校验 + 领域 validate；`mode` 由调用方决定（编辑时 / 导出前） */
export async function validateConfig<TConfig>(
  definition: ConfiguratorDefinition<TConfig>,
  config: TConfig,
  context: ValidationContext = { mode: 'edit' },
): Promise<readonly Diagnostic[]> {
  const generic = fieldDiagnostics(definition, config)
  const domain = definition.validate ? await definition.validate(config, context) : []
  return sortDiagnostics([...generic, ...domain])
}
