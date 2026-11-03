import { describe, expect, it } from 'vite-plus/test'
import { assertContract, checkContract, defineConfigurator } from '../src/index.ts'
import { demoDefaults, demoDefinition, type DemoConfig } from './fixtures/theme.ts'

describe('checkContract', () => {
  it('合格定义通过', async () => {
    const report = await checkContract(demoDefinition)
    expect(report.issues).toEqual([])
    expect(report.ok).toBe(true)
  })

  it('字段声明自洽性：路径 / 重复 / options / 范围', async () => {
    const definition = defineConfigurator<DemoConfig>({
      ...demoDefinition,
      fields: [
        { path: 'tokens/seed/primaryHue', label: '主色相', type: 'hue' },
        { path: '/meta/name', label: '名称', type: 'text' },
        { path: '/meta/name', label: '', type: 'text' },
        { path: '/meta/dark', label: '暗色', type: 'select' },
        { path: '/tokens/seed/lightness', label: '明度', type: 'slider', min: 1, max: 0 },
      ],
    })

    const report = await checkContract(definition, { export: false })
    const codes = report.issues.map((item) => item.code)
    expect(codes).toContain('field/pointer')
    expect(codes).toContain('field/duplicate')
    expect(codes).toContain('field/label')
    expect(codes).toContain('field/options')
    expect(codes).toContain('field/range')
  })

  it('默认值必须是规范形', async () => {
    const definition = defineConfigurator<DemoConfig>({
      ...demoDefinition,
      defaults: {
        ...demoDefaults,
        tokens: {
          ...demoDefaults.tokens,
          seed: { ...demoDefaults.tokens.seed, primaryHue: '210' as unknown as number },
        },
      },
    })

    const report = await checkContract(definition, { export: false })
    expect(report.issues.map((item) => item.code)).toContain('normalize/defaults-stable')
  })

  it('预设 id 重复会报错', async () => {
    const preset = demoDefinition.presets?.[0]
    if (!preset) throw new Error('fixture 缺少预设')
    const definition = defineConfigurator<DemoConfig>({
      ...demoDefinition,
      presets: [preset, { ...preset }],
    })

    const report = await checkContract(definition, { export: false })
    expect(report.issues.map((item) => item.code)).toContain('preset/duplicate')
  })

  it('导出不确定会被抓出来', async () => {
    let calls = 0
    const definition = defineConfigurator<DemoConfig>({
      ...demoDefinition,
      export: () => ({ files: [{ path: 'tokens.css', content: `calls:${(calls += 1)}` }] }),
    })

    const report = await checkContract(definition)
    expect(report.issues.map((item) => item.code)).toContain('export/deterministic')
  })

  it('assertContract 在不合格时抛错', async () => {
    const definition = defineConfigurator<DemoConfig>({ ...demoDefinition, id: '' })
    await expect(assertContract(definition, { export: false })).rejects.toThrow(/adapter 契约未通过/)
  })
})
