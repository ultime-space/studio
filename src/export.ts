/**
 * export.ts — 导出编排（产物清单 / manifest / lock）
 * ---------------------------------------------------------------------------
 * `export()` = 规范化 → 校验 → 定义包的 export；有 error 返回 `ok: false`，不抛异常、不做文件 IO。
 * lock 只记 hash、不记时间戳：同一输入产物逐字节相同，lock 也必须相同。
 */

import type { ConfiguratorDefinition } from './definition.ts'
import { hasErrors, validateConfig } from './diagnostics.ts'
import { stableStringify } from './json.ts'
import { normalizeConfig } from './normalize.ts'
import type { Artifact, ExportContext, ExportOutcome, LockSummary } from './types.ts'

const FNV_OFFSET = 0xcbf29ce484222325n
const FNV_PRIME = 0x100000001b3n
const MASK_64 = 0xffffffffffffffffn

/**
 * FNV-1a 64 位（按 UTF-16 码元取字节，跨环境一致）。
 * 只用于产物漂移比对，不是密码学哈希。
 */
export function hashText(text: string): string {
  let hash = FNV_OFFSET
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index)
    hash = ((hash ^ BigInt(code & 0xff)) * FNV_PRIME) & MASK_64
    hash = ((hash ^ BigInt(code >>> 8)) * FNV_PRIME) & MASK_64
  }
  return hash.toString(16).padStart(16, '0')
}

/** 产物摘要：artifacts 的键按字典序，保证同输入同 lock */
export function createLock(config: unknown, files: readonly Artifact[]): LockSummary {
  const artifacts: Record<string, string> = {}
  const ordered = [...files].sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
  for (const file of ordered) artifacts[file.path] = hashText(file.content)
  return { configHash: hashText(stableStringify(config)), artifacts }
}

/** 无状态导出：给 CLI / AI / 一次性导出用，不需要先建控制器 */
export async function exportConfig<TConfig>(
  definition: ConfiguratorDefinition<TConfig>,
  input: unknown,
  context: ExportContext = {},
): Promise<ExportOutcome> {
  const config = normalizeConfig(definition, input)
  const diagnostics = await validateConfig(definition, config, { mode: 'export' })
  if (hasErrors(diagnostics)) return { ok: false, files: [], diagnostics }

  const result = await definition.export(config, context)
  return {
    ok: true,
    files: result.files,
    diagnostics,
    lock: result.lock ?? createLock(config, result.files),
  }
}
