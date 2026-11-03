/**
 * persistence.ts — 纯编解码（JSON / 分享串 / URL hash）
 * ---------------------------------------------------------------------------
 * 运行时只做字符串转换：不碰 localStorage、不写文件、不做下载、不做大小保护（归上游）。
 * 分享串带定义版本，读回时先迁移再规范化，旧链接不会因为字段变化直接失效。
 */

import type { ConfiguratorDefinition } from './definition.ts'
import { StudioError } from './errors.ts'
import { isPlainObject, stableStringify } from './json.ts'
import { normalizeConfig, type NormalizeOptions } from './normalize.ts'

export const SHARE_PREFIX = 'v1.'
export const DEFAULT_SHARE_KEY = 'studio'

interface ShareEnvelope {
  /** 定义版本，读回时用于迁移 */
  v: string
  c: unknown
}

function parse<TConfig>(
  definition: ConfiguratorDefinition<TConfig>,
  parsed: unknown,
  options: NormalizeOptions,
): TConfig {
  if (!isPlainObject(parsed)) throw new StudioError('config/type', '配置必须是对象')
  const raw = { ...parsed }
  const declared = typeof raw.$version === 'string' ? raw.$version : undefined
  /* `$version` 是文件元信息，不进配置本体 */
  delete raw.$version
  return normalizeConfig(definition, raw, { version: options.version ?? declared })
}

/** 规范化配置的稳定 JSON：可直接落 `ultime.config.json`，不含派生值 */
export function serializeConfig<TConfig>(definition: ConfiguratorDefinition<TConfig>, config: TConfig): string {
  return stableStringify(normalizeConfig(definition, config), 2)
}

/** 读回配置；根上的 `$version` 或显式 `options.version` 与定义不一致时先迁移 */
export function deserializeConfig<TConfig>(
  definition: ConfiguratorDefinition<TConfig>,
  text: string,
  options: NormalizeOptions = {},
): TConfig {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new StudioError('config/json', '配置不是合法 JSON')
  }
  return parse(definition, parsed, options)
}

/** 分享串：`v1.` + 编码后的 `{ v, c }`，版本随串走 */
export function encodeShare<TConfig>(definition: ConfiguratorDefinition<TConfig>, config: TConfig): string {
  const envelope: ShareEnvelope = { v: definition.version, c: normalizeConfig(definition, config) }
  return SHARE_PREFIX + encodeURIComponent(JSON.stringify(envelope))
}

export function decodeShare<TConfig>(definition: ConfiguratorDefinition<TConfig>, payload: string): TConfig {
  if (!payload.startsWith(SHARE_PREFIX)) {
    throw new StudioError('share/invalid', `分享串缺少前缀 ${SHARE_PREFIX}`)
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(decodeURIComponent(payload.slice(SHARE_PREFIX.length)))
  } catch {
    throw new StudioError('share/invalid', '分享串不是合法编码')
  }
  if (!isPlainObject(parsed) || typeof parsed.v !== 'string' || !('c' in parsed)) {
    throw new StudioError('share/invalid', '分享串缺少版本或配置')
  }
  return normalizeConfig(definition, parsed.c, { version: parsed.v })
}

/** URL hash：`#studio=v1.…`；由上游决定挂在哪个地址上 */
export function encodeURL<TConfig>(
  definition: ConfiguratorDefinition<TConfig>,
  config: TConfig,
  key: string = DEFAULT_SHARE_KEY,
): string {
  return `#${key}=${encodeShare(definition, config)}`
}

/** 接受完整 URL、hash 或裸分享串 */
export function decodeURL<TConfig>(
  definition: ConfiguratorDefinition<TConfig>,
  url: string,
  key: string = DEFAULT_SHARE_KEY,
): TConfig {
  const marker = `${key}=`
  const index = url.indexOf(marker)
  const payload = (index >= 0 ? url.slice(index + marker.length) : url.replace(/^#/, '')).split('&')[0]
  return decodeShare(definition, payload)
}
