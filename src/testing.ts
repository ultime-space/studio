/**
 * testing.ts — adapter 契约测试（定义包自检）
 * ---------------------------------------------------------------------------
 * 定义包写完后先跑这一组：字段声明是否自洽、默认值是否已经是规范形、
 * 序列化 / 分享串能否往返、导出是否可重建。领域 golden 测试仍由定义包自己写。
 */

import type { ConfiguratorDefinition } from './definition.ts'
import { hasErrors, validateConfig } from './diagnostics.ts'
import { exportConfig } from './export.ts'
import { findNonJsonPath, isPlainObject, stableStringify } from './json.ts'
import { normalizeConfig } from './normalize.ts'
import { decodeShare, decodeURL, deserializeConfig, encodeShare, encodeURL, serializeConfig } from './persistence.ts'
import { isPointer } from './pointer.ts'

export interface ContractIssue {
  code: string
  message: string
  path?: string
}

export interface ContractReport {
  ok: boolean
  issues: readonly ContractIssue[]
}

export interface ContractOptions {
  /** 是否检查导出确定性；默认 true */
  export?: boolean
}

function collectDefinitionIssues<TConfig>(definition: ConfiguratorDefinition<TConfig>): ContractIssue[] {
  const issues: ContractIssue[] = []
  const issue = (code: string, message: string, path?: string) => issues.push({ code, message, path })

  if (!definition.id) issue('definition/id', '缺少 id')
  if (!definition.title) issue('definition/title', '缺少 title')
  if (!definition.version) issue('definition/version', '缺少 version')

  if (!isPlainObject(definition.defaults)) {
    issue('definition/defaults', 'defaults 必须是对象', '')
  } else {
    const notJson = findNonJsonPath(definition.defaults)
    if (notJson !== null) issue('definition/defaults', 'defaults 必须是纯 JSON', notJson)
  }

  const seen = new Set<string>()
  for (const field of definition.fields) {
    if (!isPointer(field.path) || field.path === '') {
      issue('field/pointer', `字段路径不是合法 JSON Pointer：${field.path}`, field.path)
    }
    if (seen.has(field.path)) issue('field/duplicate', `字段路径重复：${field.path}`, field.path)
    seen.add(field.path)
    if (!field.label) issue('field/label', `字段缺少 label：${field.path}`, field.path)
    if ((field.type === 'select' || field.type === 'multi-select') && !field.options?.length) {
      issue('field/options', `${field.type} 字段缺少 options：${field.path}`, field.path)
    }
    if (field.min !== undefined && field.max !== undefined && field.min > field.max) {
      issue('field/range', `min 大于 max：${field.path}`, field.path)
    }
    if (field.visibleWhen && !isPointer(field.visibleWhen.path)) {
      issue('field/condition', `visibleWhen.path 不是合法 JSON Pointer：${field.visibleWhen.path}`, field.path)
    }
  }

  const presetIds = new Set<string>()
  for (const preset of definition.presets ?? []) {
    if (presetIds.has(preset.id)) issue('preset/duplicate', `预设 id 重复：${preset.id}`)
    presetIds.add(preset.id)
    if (!preset.label) issue('preset/label', `预设缺少 label：${preset.id}`)
  }

  return issues
}

async function collectBehaviorIssues<TConfig>(
  definition: ConfiguratorDefinition<TConfig>,
  options: ContractOptions,
): Promise<ContractIssue[]> {
  const issues: ContractIssue[] = []
  const issue = (code: string, message: string, path?: string) => issues.push({ code, message, path })

  let defaults: TConfig
  try {
    defaults = normalizeConfig(definition, definition.defaults)
  } catch (error) {
    issue('normalize/defaults', `默认值无法规范化：${(error as Error).message}`)
    return issues
  }

  if (stableStringify(defaults) !== stableStringify(definition.defaults)) {
    issue('normalize/defaults-stable', '默认值不是规范形（normalize(defaults) 与 defaults 不一致）')
  }

  try {
    const text = serializeConfig(definition, defaults)
    const back = deserializeConfig(definition, text)
    if (stableStringify(back) !== stableStringify(defaults)) issue('persistence/json', 'JSON 往返不一致')
  } catch (error) {
    issue('persistence/json', `JSON 往返失败：${(error as Error).message}`)
  }

  try {
    const payload = encodeShare(definition, defaults)
    if (stableStringify(decodeShare(definition, payload)) !== stableStringify(defaults)) {
      issue('persistence/share', '分享串往返不一致')
    }
    const url = encodeURL(definition, defaults)
    if (stableStringify(decodeURL(definition, url)) !== stableStringify(defaults)) {
      issue('persistence/url', 'URL 往返不一致')
    }
  } catch (error) {
    issue('persistence/share', `分享串往返失败：${(error as Error).message}`)
  }

  try {
    const diagnostics = await validateConfig(definition, defaults, { mode: 'export' })
    if (hasErrors(diagnostics)) {
      issue('validate/defaults', `默认值存在 error 级诊断：${diagnostics.map((item) => item.code).join('、')}`)
    }
  } catch (error) {
    issue('validate/defaults', `默认值校验失败：${(error as Error).message}`)
  }

  if (options.export !== false) {
    try {
      const first = await exportConfig(definition, defaults)
      const second = await exportConfig(definition, defaults)
      if (!first.ok) issue('export/defaults', '默认值导出被诊断为 error 阻断')
      if (stableStringify(first) !== stableStringify(second)) {
        issue('export/deterministic', '同一输入两次导出的产物 / lock 不一致')
      }
      if (first.ok && !first.lock) issue('export/lock', '导出缺少 lock')
    } catch (error) {
      issue('export/defaults', `默认值导出失败：${(error as Error).message}`)
    }
  }

  for (const preset of definition.presets ?? []) {
    try {
      normalizeConfig(definition, preset.config)
    } catch (error) {
      issue('preset/config', `预设 ${preset.id} 无法规范化：${(error as Error).message}`)
    }
  }

  return issues
}

/** 跑全套契约检查：定义声明 + 规范形 + 往返 + 默认值校验 + 导出确定性 */
export async function checkContract<TConfig>(
  definition: ConfiguratorDefinition<TConfig>,
  options: ContractOptions = {},
): Promise<ContractReport> {
  const issues = [...collectDefinitionIssues(definition), ...(await collectBehaviorIssues(definition, options))]
  return { ok: issues.length === 0, issues }
}

export async function assertContract<TConfig>(
  definition: ConfiguratorDefinition<TConfig>,
  options: ContractOptions = {},
): Promise<void> {
  const report = await checkContract(definition, options)
  if (report.ok) return
  const detail = report.issues
    .map((item) => `  · [${item.code}] ${item.message}${item.path ? `（${item.path}）` : ''}`)
    .join('\n')
  throw new Error(`adapter 契约未通过（${definition.id}）：\n${detail}`)
}
