/**
 * json.ts — 纯 JSON 工具（克隆 / 稳定序列化 / 等值 / 纯 JSON 检查）
 * ---------------------------------------------------------------------------
 * 确定性是运行时的硬约束：同一份配置必须序列化成同一串字节。
 * 因此所有对象键按字典序输出，不保留插入顺序。
 */

import { StudioError } from './errors.ts'

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return false
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

/** 配置是纯 JSON，深拷贝走序列化即可 */
export function cloneJson<T>(value: T): T {
  if (value === undefined) return value
  return JSON.parse(JSON.stringify(value)) as T
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue)
  if (isPlainObject(value)) {
    const out: Record<string, unknown> = {}
    for (const key of Object.keys(value).sort()) out[key] = sortValue(value[key])
    return out
  }
  return value
}

/** 稳定序列化：对象键排序，缩进可选；同一输入逐字节相同 */
export function stableStringify(value: unknown, space = 0): string {
  return JSON.stringify(sortValue(value), null, space) ?? ''
}

export function deepEqual(a: unknown, b: unknown): boolean {
  return stableStringify(a) === stableStringify(b)
}

/** 返回第一处「不是纯 JSON」的路径；全部合法返回 null */
export function findNonJsonPath(value: unknown, path = ''): string | null {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return null
  if (typeof value === 'number') return Number.isFinite(value) ? null : path
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const hit = findNonJsonPath(value[index], `${path}/${index}`)
      if (hit !== null) return hit
    }
    return null
  }
  if (isPlainObject(value)) {
    for (const key of Object.keys(value)) {
      const hit = findNonJsonPath(value[key], `${path}/${key}`)
      if (hit !== null) return hit
    }
    return null
  }
  return path || ''
}

/** 配置 / 默认值必须是纯 JSON；不合法直接抛错，避免半成品流进产物 */
export function assertJsonValue(value: unknown, what: string): void {
  const path = findNonJsonPath(value)
  if (path !== null) {
    throw new StudioError('config/not-json', `${what} 必须是纯 JSON（${path || '根'} 不是）`, path || undefined)
  }
}
