/**
 * pointer.ts — JSON Pointer 与 patch 应用（RFC 6901 / 6902 子集）
 * ---------------------------------------------------------------------------
 * 为什么统一用 JSON Pointer：同一套路径要同时服务 set / patch / 诊断锚点 / 脏字段 / AI diff。
 * 只支持 `add` / `remove` / `replace`；对象字段不做 `remove`，用 `replace` 回默认值。
 */

import { StudioError } from './errors.ts'
import { deepEqual, isPlainObject } from './json.ts'
import type { ConfigPatch } from './types.ts'

const POINTER = /^(?:\/(?:[^~/]|~[01])*)+$/

export function isPointer(path: string): boolean {
  return path === '' || POINTER.test(path)
}

function unescapeToken(token: string): string {
  return token.replace(/~1/g, '/').replace(/~0/g, '~')
}

function escapeToken(token: string): string {
  return token.replace(/~/g, '~0').replace(/\//g, '~1')
}

export function parsePointer(path: string): string[] {
  if (!isPointer(path)) throw new StudioError('pointer/invalid', `非法 JSON Pointer：${path}`, path)
  return path === '' ? [] : path.slice(1).split('/').map(unescapeToken)
}

export function joinPointer(parent: string, token: string | number): string {
  return `${parent}/${escapeToken(String(token))}`
}

function parentPointer(tokens: readonly string[]): string {
  const parents = tokens.slice(0, -1)
  return parents.length ? `/${parents.map(escapeToken).join('/')}` : ''
}

function isIndex(token: string): boolean {
  return token === '-' || /^\d+$/.test(token)
}

export function getAt(root: unknown, path: string): unknown {
  let node = root
  for (const token of parsePointer(path)) {
    if (Array.isArray(node)) {
      const index = Number(token)
      node = Number.isInteger(index) ? node[index] : undefined
    } else if (isPlainObject(node)) {
      node = node[token]
    } else {
      return undefined
    }
    if (node === undefined) return undefined
  }
  return node
}

function containerFor(next: string): Record<string, unknown> | unknown[] {
  return isIndex(next) ? [] : {}
}

function arrayIndex(token: string, path: string, max: number): number {
  const index = Number(token)
  if (!Number.isInteger(index) || index < 0 || index > max) {
    throw new StudioError('pointer/invalid', `数组下标越界：${path}`, path)
  }
  return index
}

/** 就地写入；调用方先拿到一份副本，运行时本身不改已发布的状态对象 */
export function setAt(root: unknown, path: string, value: unknown): void {
  const tokens = parsePointer(path)
  if (!tokens.length) throw new StudioError('pointer/invalid', '不支持整树替换，请用 replace()', path)

  let node = root as Record<string, unknown> | unknown[]
  for (let index = 0; index < tokens.length - 1; index += 1) {
    const token = tokens[index]
    const next = tokens[index + 1]
    if (Array.isArray(node)) {
      const at = arrayIndex(token, path, node.length)
      const current = node[at]
      if (current === null || typeof current !== 'object') node[at] = containerFor(next)
      node = node[at] as Record<string, unknown> | unknown[]
    } else {
      const current = node[token]
      if (current === null || typeof current !== 'object') node[token] = containerFor(next)
      node = node[token] as Record<string, unknown> | unknown[]
    }
  }

  const last = tokens[tokens.length - 1]
  if (Array.isArray(node)) {
    const at = last === '-' ? node.length : arrayIndex(last, path, node.length)
    node[at] = value
  } else {
    node[last] = value
  }
}

export function removeAt(root: unknown, path: string): void {
  const tokens = parsePointer(path)
  if (!tokens.length) throw new StudioError('pointer/invalid', '不支持删除整棵配置', path)

  const parent = getAt(root, parentPointer(tokens))
  const last = tokens[tokens.length - 1]
  if (Array.isArray(parent)) {
    const index = Number(last)
    if (Number.isInteger(index) && index >= 0 && index < parent.length) parent.splice(index, 1)
  } else if (isPlainObject(parent)) {
    delete parent[last]
  }
}

function isArrayIndex(token: string, length: number): boolean {
  return token === '-' || (/^\d+$/.test(token) && Number(token) <= length)
}

/** 应用一段 patch；任何非法操作都在写坏配置前抛出 */
export function applyPatch<TConfig>(config: TConfig, patch: ConfigPatch): TConfig {
  const next = JSON.parse(JSON.stringify(config)) as TConfig
  for (const operation of patch) {
    const tokens = parsePointer(operation.path)
    const parent = tokens.length ? getAt(next, parentPointer(tokens)) : undefined
    const last = tokens[tokens.length - 1]

    if (operation.op === 'remove') {
      removeAt(next, operation.path)
      continue
    }

    if (!tokens.length) throw new StudioError('patch/invalid', '不支持整树替换，请用 replace()', operation.path)

    if (operation.op === 'add' && Array.isArray(parent)) {
      if (!isArrayIndex(last, parent.length)) {
        throw new StudioError('patch/invalid', `数组下标越界：${operation.path}`, operation.path)
      }
      if (last === '-') parent.push(operation.value)
      else parent.splice(Number(last), 0, operation.value)
      continue
    }

    setAt(next, operation.path, operation.value)
  }
  return next
}

/** 配置差异的叶子路径：用于脏字段与「影响半径」 */
export function diffPaths(before: unknown, after: unknown, base = ''): string[] {
  if (deepEqual(before, after)) return []

  const beforeObject = isPlainObject(before)
  const afterObject = isPlainObject(after)
  if (beforeObject && afterObject) {
    const keys = new Set([...Object.keys(before), ...Object.keys(after)])
    return [...keys].sort().flatMap((key) => diffPaths(before[key], after[key], joinPointer(base, key)))
  }

  if (Array.isArray(before) && Array.isArray(after)) {
    const length = Math.max(before.length, after.length)
    const paths: string[] = []
    for (let index = 0; index < length; index += 1) {
      paths.push(...diffPaths(before[index], after[index], joinPointer(base, index)))
    }
    return paths
  }

  return base ? [base] : []
}
