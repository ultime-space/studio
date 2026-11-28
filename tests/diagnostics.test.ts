import { describe, expect, it } from 'vite-plus/test'
import {
  applyDiagnosticFix,
  fieldDiagnostics,
  hasErrors,
  sortDiagnostics,
  validateConfig,
  type Diagnostic,
} from '../src/index.ts'
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

function pick(config: DemoConfig, path: string): Diagnostic {
  const hit = fieldDiagnostics(demoDefinition, config).find((item) => item.path === path)
  if (!hit) throw new Error(`没有 ${path} 的诊断`)
  return hit
}

describe('修复建议', () => {
  it('缺失给 add 默认值；应用后诊断消失，入参不变', () => {
    const config = structuredClone(demoDefaults)
    delete (config.theme.accent as { hue?: number }).hue

    const diagnostic = pick(config, '/theme/accent/hue')
    expect(diagnostic.code).toBe('field/missing')
    expect(diagnostic.fix?.patch).toEqual([{ op: 'add', path: '/theme/accent/hue', value: 210 }])

    const fixed = applyDiagnosticFix(config, diagnostic)
    expect(fixed.theme.accent.hue).toBe(210)
    expect((config.theme.accent as { hue?: number }).hue).toBeUndefined()
    expect(fieldDiagnostics(demoDefinition, fixed).some((item) => item.path === '/theme/accent/hue')).toBe(false)
  })

  it('越界 clamp 到边界', () => {
    const config = structuredClone(demoDefaults)
    config.theme.accent.hue = 400

    const diagnostic = pick(config, '/theme/accent/hue')
    expect(diagnostic.code).toBe('field/range')
    expect(diagnostic.fix?.patch).toEqual([{ op: 'replace', path: '/theme/accent/hue', value: 360 }])
    expect(applyDiagnosticFix(config, diagnostic).theme.accent.hue).toBe(360)
  })

  it('select 非法值回落默认', () => {
    const config = structuredClone(demoDefaults)
    config.theme.accent.tone = 'neon'

    const diagnostic = pick(config, '/theme/accent/tone')
    expect(diagnostic.code).toBe('field/enum')
    expect(diagnostic.fix?.label).toContain('恢复默认值')
    expect(applyDiagnosticFix(config, diagnostic).theme.accent.tone).toBe('neutral')
  })

  it('multi-select 只过滤非法项', () => {
    const config = structuredClone(demoDefaults)
    config.theme.formats = ['css', 'pdf']

    const diagnostic = pick(config, '/theme/formats')
    expect(diagnostic.fix?.patch).toEqual([{ op: 'replace', path: '/theme/formats', value: ['css'] }])
    expect(applyDiagnosticFix(config, diagnostic).theme.formats).toEqual(['css'])
  })

  it('没有 fix 的诊断拒绝应用', () => {
    const diagnostic: Diagnostic = { level: 'error', code: 'demo/custom', message: '自定义规则' }
    expect(() => applyDiagnosticFix(demoDefaults, diagnostic)).toThrow(/没有可应用的 fix/)
  })
})
