import { describe, expect, it } from 'vite-plus/test'
import {
  defineConfigurator,
  deserializeConfig,
  normalizeConfig,
  StudioError,
  type ConfiguratorDefinition,
} from '../src/index.ts'
import { demoDefaults, demoDefinition, type DemoConfig } from './fixtures/theme.ts'

const withPolicy = (policy: 'reject' | 'strip' | 'allow'): ConfiguratorDefinition<DemoConfig> => ({
  ...demoDefinition,
  unknownPolicy: policy,
})

describe('normalizeConfig', () => {
  it('补默认值，只覆盖输入里出现的字段', () => {
    const config = normalizeConfig(demoDefinition, { meta: { name: 'custom' } })
    expect(config.meta.name).toBe('custom')
    expect(config.meta.dark).toBe(false)
    expect(config.theme.accent.hue).toBe(210)
    expect(config.theme.spacing).toEqual([4, 8, 12, 16])
  })

  it('空输入等于默认值', () => {
    expect(normalizeConfig(demoDefinition, undefined)).toEqual(demoDefaults)
    expect(normalizeConfig(demoDefinition, {})).toEqual(demoDefaults)
  })

  it('未知字段默认 reject', () => {
    expect(() => normalizeConfig(demoDefinition, { nope: 1 })).toThrow(StudioError)
    try {
      normalizeConfig(demoDefinition, { nope: 1 })
    } catch (error) {
      expect((error as StudioError).code).toBe('config/unknown-field')
      expect((error as StudioError).path).toBe('/nope')
    }
  })

  it('未知字段 strip 会剥离，allow 会保留', () => {
    expect('nope' in normalizeConfig(withPolicy('strip'), { nope: 1 })).toBe(false)
    const allowed = normalizeConfig(withPolicy('allow'), { nope: 1 }) as unknown as Record<string, unknown>
    expect(allowed.nope).toBe(1)
  })

  it('根上的 $schema 视为元信息，不参与未知字段判定', () => {
    const config = normalizeConfig(demoDefinition, { $schema: './schema.json' })
    expect((config as unknown as Record<string, unknown>).$schema).toBe('./schema.json')
  })

  it('类型不匹配直接抛错', () => {
    expect(() => normalizeConfig(demoDefinition, { theme: [] })).toThrow(StudioError)
  })

  it('数组整体替换，不做逐项合并', () => {
    const config = normalizeConfig(demoDefinition, { theme: { spacing: [2, 4] } })
    expect(config.theme.spacing).toEqual([2, 4])
  })

  it('字段级修正数字字符串', () => {
    const config = normalizeConfig(demoDefinition, { theme: { accent: { hue: '120' } } })
    expect(config.theme.accent.hue).toBe(120)
  })

  it('旧版本配置走 migrate', () => {
    const definition = defineConfigurator<DemoConfig>({
      ...demoDefinition,
      version: '2.0.0',
      migrate: (input, fromVersion) => {
        const legacy = input as { hue?: number }
        return {
          ...demoDefaults,
          meta: { ...demoDefaults.meta, name: fromVersion },
          theme: {
            ...demoDefaults.theme,
            accent: { ...demoDefaults.theme.accent, hue: legacy.hue ?? 0 },
          },
        }
      },
    })

    const config = normalizeConfig(definition, { hue: 300 }, { version: '1.0.0' })
    expect(config.theme.accent.hue).toBe(300)
    expect(config.meta.name).toBe('1.0.0')
  })

  it('版本不一致但没有 migrate 时抛错', () => {
    try {
      normalizeConfig(demoDefinition, {}, { version: '0.9.0' })
      throw new Error('should throw')
    } catch (error) {
      expect((error as StudioError).code).toBe('config/version')
    }
  })

  it('JSON 根上的 $version 与定义一致时不迁移，且不进入配置', () => {
    const config = deserializeConfig(demoDefinition, JSON.stringify({ $version: '1.0.0', meta: { name: 'x' } }))
    expect(config.meta.name).toBe('x')
    expect('$version' in config).toBe(false)
  })

  it('JSON 根上的 $version 与定义不一致且无 migrate 时抛错', () => {
    expect(() => deserializeConfig(demoDefinition, JSON.stringify({ $version: '0.9.0' }))).toThrow(StudioError)
  })

  it('反序列化按 unknownPolicy 处理未知字段', () => {
    const text = JSON.stringify({ nope: 1 })
    expect(() => deserializeConfig(demoDefinition, text)).toThrow(StudioError)
    expect('nope' in deserializeConfig(withPolicy('strip'), text)).toBe(false)
    expect((deserializeConfig(withPolicy('allow'), text) as unknown as Record<string, unknown>).nope).toBe(1)
  })

  it('definition.normalize 在补默认之后执行', () => {
    const definition = defineConfigurator<DemoConfig>({
      ...demoDefinition,
      normalize: (input) => {
        const config = input as DemoConfig
        return {
          ...config,
          theme: {
            ...config.theme,
            accent: { ...config.theme.accent, hue: Math.round(config.theme.accent.hue) },
          },
        }
      },
    })

    const config = normalizeConfig(definition, { theme: { accent: { hue: 12.7 } } })
    expect(config.theme.accent.hue).toBe(13)
  })
})
