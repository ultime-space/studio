import { describe, expect, it } from 'vite-plus/test'

import {
  createLock,
  decodeShare,
  decodeURL,
  deepEqual,
  deserializeConfig,
  diffPaths,
  encodeShare,
  encodeURL,
  exportConfig,
  findNonJsonPath,
  getAt,
  hashText,
  isPointer,
  joinPointer,
  parsePointer,
  previewConfig,
  removeAt,
  serializeConfig,
  setAt,
  stableStringify,
  StudioError,
  applyPatch,
} from '../src/index.ts'
import { demoDefaults, demoDefinition } from './fixtures/theme.ts'

describe('studio · JSON 工具', () => {
  it('稳定序列化按对象键排序', () => {
    expect(stableStringify({ b: 1, a: { d: 2, c: 3 } })).toBe('{"a":{"c":3,"d":2},"b":1}')
  })

  it('deepEqual 不依赖键顺序', () => {
    expect(deepEqual({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true)
    expect(deepEqual({ a: 1 }, { a: 2 })).toBe(false)
  })

  it('findNonJsonPath 找到第一处非 JSON 值', () => {
    expect(findNonJsonPath({ a: () => 1 })).toBe('/a')
    expect(findNonJsonPath([1, undefined])).toBe('/1')
    expect(findNonJsonPath({ a: [1, 'ok'] })).toBe(null)
  })
})

describe('studio · JSON Pointer', () => {
  it('解析 / 拼接 / 判定', () => {
    expect(parsePointer('/a~1b/~0c')).toEqual(['a/b', '~c'])
    expect(joinPointer('', 'a/b')).toBe('/a~1b')
    expect(isPointer('')).toBe(true)
    expect(isPointer('/a/b')).toBe(true)
    expect(isPointer('a/b')).toBe(false)
    expect(() => parsePointer('a/b')).toThrow(StudioError)
  })

  it('getAt / setAt 支持嵌套与数组追加', () => {
    const root: Record<string, unknown> = {}
    setAt(root, '/a/b', 1)
    setAt(root, '/list/-', 'x')
    setAt(root, '/list/-', 'y')

    expect(getAt(root, '/a/b')).toBe(1)
    expect(getAt(root, '/list')).toEqual(['x', 'y'])
    expect(() => setAt(root, '/list/9', 'z')).toThrow(StudioError)
  })

  it('removeAt 处理对象与数组', () => {
    const root = { a: { b: 1 }, list: ['x', 'y'] }
    removeAt(root, '/a/b')
    removeAt(root, '/list/0')

    expect(root).toEqual({ a: {}, list: ['y'] })
    expect(() => removeAt(root, '')).toThrow(StudioError)
  })

  it('applyPatch 支持 add / replace / remove，且不改原对象', () => {
    const base = { list: ['a'], nested: { value: 1 } }
    const next = applyPatch(base, [
      { op: 'add', path: '/list/-', value: 'b' },
      { op: 'replace', path: '/nested/value', value: 2 },
      { op: 'remove', path: '/list/0' },
    ])

    expect(next).toEqual({ list: ['b'], nested: { value: 2 } })
    expect(base).toEqual({ list: ['a'], nested: { value: 1 } })
  })

  it('diffPaths 返回排序后的叶子路径', () => {
    expect(diffPaths({ b: 2, a: 1 }, { b: 3, a: 1 })).toEqual(['/b'])
    expect(diffPaths({ a: [1, 2] }, { a: [1, 3] })).toEqual(['/a/1'])
    expect(diffPaths({ a: 1 }, { a: 1 })).toEqual([])
  })
})

describe('studio · 编解码', () => {
  it('serialize / deserialize 往返，且键稳定', () => {
    const text = serializeConfig(demoDefinition, demoDefaults)
    expect(Object.keys(JSON.parse(text))).toEqual(['meta', 'theme'])
    expect(deserializeConfig(demoDefinition, text)).toEqual(demoDefaults)
  })

  it('分享串与 URL 往返，非法前缀报错', () => {
    const share = encodeShare(demoDefinition, demoDefaults)
    expect(share.startsWith('v1.')).toBe(true)
    expect(decodeShare(demoDefinition, share)).toEqual(demoDefaults)

    const url = encodeURL(demoDefinition, demoDefaults)
    expect(url.startsWith('#studio=')).toBe(true)
    expect(decodeURL(demoDefinition, `https://example.com/${url}`)).toEqual(demoDefaults)

    expect(() => decodeShare(demoDefinition, 'nope')).toThrow(StudioError)
  })
})

describe('studio · 导出与预览', () => {
  it('hashText 与 createLock 可复现，lock 键排序', () => {
    const files = [
      { path: 'b.css', content: 'b' },
      { path: 'a.css', content: 'a' },
    ]
    const first = createLock({ b: 1, a: 2 }, files)
    const second = createLock({ a: 2, b: 1 }, [...files].reverse())

    expect(hashText('demo')).toBe(hashText('demo'))
    expect(first).toEqual(second)
    expect(Object.keys(first.artifacts)).toEqual(['a.css', 'b.css'])
  })

  it('校验失败时 exportConfig 返回 ok: false', async () => {
    const outcome = await exportConfig(demoDefinition, {
      ...demoDefaults,
      theme: { ...demoDefaults.theme, spacing: [] },
    })

    expect(outcome.ok).toBe(false)
    expect(outcome.files).toEqual([])
    expect(outcome.diagnostics.some((item) => item.code === 'demo/space-empty')).toBe(true)
  })

  it('previewConfig 直接返回定义包的预览模型', () => {
    expect(previewConfig(demoDefinition, demoDefaults)?.css).toContain('--accent-hue')
  })
})
