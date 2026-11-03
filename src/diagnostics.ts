/**
 * diagnostics.ts — 通用字段校验与诊断排序
 * ---------------------------------------------------------------------------
 * 运行时只做通用的类型 / 枚举 / 范围校验；对比度、依赖闭包这类领域规则由定义的 validate() 提供。
 * `error` 阻断导出，`warn` / `info` 只提示；诊断带 path，上游据此定位到字段。
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
  const push = (code: string, message: string): Diagnostic => ({
    level: 'error',
    code: `field/${code}`,
    message: `${field.label}：${message}`,
    path: at,
  })

  if (isMissing(value)) {
    return field.optional ? [] : [push('missing', '必填项缺失')]
  }

  switch (field.type) {
    case 'number':
    case 'slider':
    case 'hue': {
      if (typeof value !== 'number' || !Number.isFinite(value)) return [push('type', '应为数字')]
      const issues: Diagnostic[] = []
      if (field.min !== undefined && value < field.min) issues.push(push('range', `不得小于 ${field.min}`))
      if (field.max !== undefined && value > field.max) issues.push(push('range', `不得大于 ${field.max}`))
      return issues
    }
    case 'switch':
      return typeof value === 'boolean' ? [] : [push('type', '应为布尔值')]
    case 'text':
    case 'color':
      return typeof value === 'string' ? [] : [push('type', '应为字符串')]
    case 'select':
      return isOptionValue(field, value) ? [] : [push('enum', '取值不在选项内')]
    case 'multi-select': {
      if (!Array.isArray(value)) return [push('type', '应为数组')]
      const invalid = value.filter((item) => !isOptionValue(field, item))
      return invalid.length ? [push('enum', `取值不在选项内：${invalid.join('、')}`)] : []
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
