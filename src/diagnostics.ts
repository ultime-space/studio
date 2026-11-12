/**
 * diagnostics.ts — 通用字段校验与诊断排序
 * ---------------------------------------------------------------------------
 * 运行时只做通用的类型 / 枚举 / 范围校验；对比度、依赖闭包这类领域规则由定义的 validate() 提供。
 * `error` 阻断导出，`warn` / `info` 只提示；诊断带 path，上游据此定位到字段。
 * 范围分两层：`min` / `max` 是合法域（越界 error），`suggested` 是建议区间（越界 warn）。
 */

import type { ConfiguratorDefinition, FieldSpec } from './definition.ts'
import { getAt } from './pointer.ts'
import type { Diagnostic, DiagnosticLevel, ValidationContext } from './types.ts'

const WEIGHT: Record<DiagnosticLevel, number> = { error: 0, warn: 1, info: 2 }

function isMissing(value: unknown): boolean {
  return value === undefined || value === null
}

function isOptionValue(field: FieldSpec, value: unknown): boolean {
  return (field.options ?? []).some((option) => option.value === value)
}

function checkField(field: FieldSpec, value: unknown): Diagnostic[] {
  const at = field.path
  const push = (code: string, message: string, level: DiagnosticLevel = 'error', hint?: string): Diagnostic => ({
    level,
    code: `field/${code}`,
    message: `${field.label}：${message}`,
    path: at,
    ...(hint === undefined ? {} : { hint }),
  })

  if (isMissing(value)) {
    return field.optional ? [] : [push('missing', '必填项缺失', 'error', '填写该字段，或把字段标为 optional')]
  }

  switch (field.type) {
    case 'number':
    case 'slider':
    case 'hue': {
      if (typeof value !== 'number' || !Number.isFinite(value)) return [push('type', '应为数字', 'error', '改为数字')]
      const bounds = `${field.min ?? '−∞'}–${field.max ?? '∞'}`
      const hard: Diagnostic[] = []
      if (field.min !== undefined && value < field.min) {
        hard.push(push('range', `不得小于 ${field.min}`, 'error', `调整到 ${bounds}`))
      }
      if (field.max !== undefined && value > field.max) {
        hard.push(push('range', `不得大于 ${field.max}`, 'error', `调整到 ${bounds}`))
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
      return typeof value === 'boolean' ? [] : [push('type', '应为布尔值', 'error', '改为 true / false')]
    case 'text':
    case 'color':
      return typeof value === 'string' ? [] : [push('type', '应为字符串', 'error', '改为字符串')]
    case 'select':
      return isOptionValue(field, value) ? [] : [push('enum', '取值不在选项内', 'error', '从 options 中选一个')]
    case 'multi-select': {
      if (!Array.isArray(value)) return [push('type', '应为数组', 'error', '改为数组')]
      const invalid = value.filter((item) => !isOptionValue(field, item))
      return invalid.length
        ? [push('enum', `取值不在选项内：${invalid.join('、')}`, 'error', '移除不在 options 中的取值')]
        : []
    }
    case 'custom':
      return []
  }
}

/** 通用字段校验；`custom` 字段跳过，语义交给定义的 validate() */
export function fieldDiagnostics<TConfig>(definition: ConfiguratorDefinition<TConfig>, config: TConfig): Diagnostic[] {
  return definition.fields.flatMap((field) => checkField(field, getAt(config, field.path)))
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
