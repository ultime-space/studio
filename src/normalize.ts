/**
 * normalize.ts — 规范化（补默认 / 未知字段策略 / 字段级取值修正）
 * ---------------------------------------------------------------------------
 * 顺序固定：迁移 → 未知字段策略 → 补默认 → 字段修正 → 领域自定义 normalize。
 * 只有「根本读不懂输入」才抛错；取值不合规留给 diagnostics，不在这里静默改写语义。
 */

import type { ConfiguratorDefinition, FieldSpec } from './definition.ts'
import { StudioError } from './errors.ts'
import { cloneJson, isPlainObject } from './json.ts'
import { getAt, joinPointer, parsePointer, removeAt, setAt } from './pointer.ts'

export interface NormalizeOptions {
  /** 输入的配置版本；与定义的 version 不一致时走 migrate */
  version?: string
}

/** 字段级取值修正：只做「字符串 ↔ 数字 / 布尔」这种无损转换，不做范围裁剪 */
export function coerceFieldValue(field: FieldSpec, value: unknown): unknown {
  if (value === undefined || value === null) return value
  switch (field.type) {
    case 'number':
    case 'slider':
    case 'hue': {
      if (typeof value === 'number') return value
      if (typeof value === 'string' && value.trim() !== '') {
        const parsed = Number(value)
        return Number.isFinite(parsed) ? parsed : value
      }
      return value
    }
    case 'switch':
      if (value === 'true') return true
      if (value === 'false') return false
      return value
    default:
      return value
  }
}

interface KnownPaths {
  exact: Set<string>
  /** 字段路径是「子树根」：其下所有路径都视为已知（`custom` 字段常整体成对象） */
  subtrees: string[]
}

function collectKnown(definition: ConfiguratorDefinition<unknown>): KnownPaths {
  const exact = new Set<string>()
  const subtrees: string[] = []

  const walk = (value: unknown, path: string): void => {
    exact.add(path)
    if (isPlainObject(value)) {
      for (const key of Object.keys(value)) walk(value[key], joinPointer(path, key))
    }
  }
  walk(definition.defaults, '')

  for (const field of definition.fields) {
    let path = ''
    for (const token of parsePointer(field.path)) {
      path = joinPointer(path, token)
      exact.add(path)
    }
    subtrees.push(field.path)
  }

  return { exact, subtrees }
}

function known(paths: KnownPaths, path: string): boolean {
  if (paths.exact.has(path)) return true
  return paths.subtrees.some((root) => path === root || path.startsWith(`${root}/`))
}

function collectUnknown(input: unknown, paths: KnownPaths): string[] {
  const unknown: string[] = []
  const walk = (value: unknown, path: string): void => {
    if (!isPlainObject(value)) return
    for (const key of Object.keys(value)) {
      /* 根上的 `$schema` / `$version` 是元信息，不是配置字段 */
      if (!path && key.startsWith('$')) continue
      const child = joinPointer(path, key)
      if (!known(paths, child)) {
        unknown.push(child)
        continue
      }
      walk(value[key], child)
    }
  }
  walk(input, '')
  return unknown
}

function applyUnknownPolicy(
  definition: ConfiguratorDefinition<unknown>,
  input: Record<string, unknown>,
): Record<string, unknown> {
  const policy = definition.unknownPolicy ?? 'reject'
  if (policy === 'allow') return cloneJson(input)

  const unknown = collectUnknown(input, collectKnown(definition))
  if (!unknown.length) return cloneJson(input)

  if (policy === 'reject') {
    throw new StudioError('config/unknown-field', `未知字段：${unknown.join('、')}`, unknown[0])
  }

  const copy = cloneJson(input)
  for (const path of unknown) removeAt(copy, path)
  return copy
}

function mergeDefaults(base: unknown, source: unknown, path: string): unknown {
  if (source === undefined) return base

  if (Array.isArray(base)) {
    if (!Array.isArray(source)) throw new StudioError('config/type', '应为数组', path)
    return source
  }

  if (isPlainObject(base)) {
    if (!isPlainObject(source)) throw new StudioError('config/type', '应为对象', path)
    const out: Record<string, unknown> = { ...base }
    for (const key of Object.keys(source)) {
      out[key] = mergeDefaults(base[key], source[key], joinPointer(path, key))
    }
    return out
  }

  return source
}

function coerceFields(config: Record<string, unknown>, fields: readonly FieldSpec[]): Record<string, unknown> {
  for (const field of fields) {
    const current = getAt(config, field.path)
    if (current === undefined) continue
    const coerced = coerceFieldValue(field, current)
    if (coerced !== current) setAt(config, field.path, coerced)
  }
  return config
}

function migrate(definition: ConfiguratorDefinition<unknown>, input: unknown, version?: string): unknown {
  if (!version || version === definition.version) return input
  if (!definition.migrate) {
    throw new StudioError(
      'config/version',
      `配置版本 ${version} 无法迁移到 ${definition.version}（定义未提供 migrate）`,
    )
  }
  return definition.migrate(input, version)
}

/** 规范化：输入可以是任意 JSON（含空），输出一定是完整、纯 JSON 的配置 */
export function normalizeConfig<TConfig>(
  definition: ConfiguratorDefinition<TConfig>,
  input: unknown,
  options: NormalizeOptions = {},
): TConfig {
  if (!isPlainObject(definition.defaults)) {
    throw new StudioError('config/type', `定义 ${definition.id} 的 defaults 必须是对象`)
  }

  const migrated = migrate(definition as ConfiguratorDefinition<unknown>, input, options.version)
  const raw = migrated === undefined || migrated === null ? {} : migrated
  if (!isPlainObject(raw)) throw new StudioError('config/type', '配置必须是对象')

  let config = mergeDefaults(
    cloneJson(definition.defaults) as unknown,
    applyUnknownPolicy(definition as ConfiguratorDefinition<unknown>, raw),
    '',
  ) as Record<string, unknown>

  config = coerceFields(config, definition.fields)

  if (definition.normalize) {
    const custom = definition.normalize(cloneJson(config))
    if (!isPlainObject(custom)) throw new StudioError('config/type', 'definition.normalize 必须返回对象')
    config = coerceFields(cloneJson(custom), definition.fields)
  }

  return config as TConfig
}
