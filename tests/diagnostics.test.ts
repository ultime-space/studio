import { describe, expect, it } from 'vite-plus/test'
import { fieldDiagnostics, hasErrors, sortDiagnostics, validateConfig, type Diagnostic } from '../src/index.ts'
import { demoDefaults, demoDefinition, type DemoConfig } from './fixtures/theme.ts'

describe('诊断排序与稳定性', () => {
  it('同输入多次排序一致', () => {
    const input: Diagnostic[] = [
      { level: 'warn', code: 'b', message: 'b', path: '/z' },
      { level: 'error', code: 'a', message: 'a', path: '/a' },
      { level: 'info', code: 'c', message: 'c', path: '/a' },
    ]
    expect(sortDiagnostics(input)).toEqual(sortDiagnostics([...input]))
  })

  it('同 path 按级别与 code 排序，重复 path 不丢', () => {
    const sorted = sortDiagnostics([
      { level: 'warn', code: 'b', message: 'b', path: '/a' },
      { level: 'error', code: 'c', message: 'c', path: '/a' },
      { level: 'error', code: 'a', message: 'a', path: '/a' },
    ])
    expect(sorted.map((item) => `${item.level}:${item.code}`)).toEqual(['error:a', 'error:c', 'warn:b'])
  })

  it('未知 path 与缺 hint 原样保留', () => {
    const input: Diagnostic[] = [{ level: 'warn', code: 'x', message: 'x', path: '/unknown' }]
    expect(sortDiagnostics(input)).toEqual(input)
  })
})

describe('配置诊断', () => {
  it('空配置报必填，顺序稳定', () => {
    const first = fieldDiagnostics(demoDefinition, {} as DemoConfig)
    const second = fieldDiagnostics(demoDefinition, {} as DemoConfig)
    expect(first).toEqual(second)
    expect(first.length).toBeGreaterThan(0)
    expect(first.every((item) => item.level === 'error')).toBe(true)
    expect(hasErrors(first)).toBe(true)
  })

  it('通用与领域诊断合并后仍稳定', async () => {
    const config = structuredClone(demoDefaults)
    config.theme.spacing = []

    const first = await validateConfig(demoDefinition, config)
    const second = await validateConfig(demoDefinition, structuredClone(config))
    expect(first).toEqual(second)
    expect(first.map((item) => item.code)).toContain('demo/space-empty')
    expect(first.every((item) => item.path !== undefined)).toBe(true)
  })
})
