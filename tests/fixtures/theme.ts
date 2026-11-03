/**
 * theme.ts — 契约测试用的最小定义（不是真实设计系统）
 * ---------------------------------------------------------------------------
 * 覆盖 hue / slider / select / multi-select / text / switch 六种字段与一个领域校验，
 * 用来验证运行时协议本身，不承载任何领域语义。
 */

import { defineConfigurator, type ConfiguratorDefinition } from '../../src/index.ts'

export interface DemoConfig {
  tokens: {
    seed: {
      primaryHue: number
      lightness: number
      neutral: { light: { temperature: string } }
    }
    subset: { space: number[] }
    platforms: string[]
  }
  meta: {
    name: string
    dark: boolean
  }
}

export const demoDefaults: DemoConfig = {
  tokens: {
    seed: {
      primaryHue: 210,
      lightness: 0.64,
      neutral: { light: { temperature: 'neutral' } },
    },
    subset: { space: [4, 8, 12, 16] },
    platforms: ['css', 'json'],
  },
  meta: {
    name: 'demo',
    dark: false,
  },
}

export const demoDefinition: ConfiguratorDefinition<DemoConfig> = defineConfigurator({
  id: 'demo-theme',
  title: '示例主题',
  version: '1.0.0',
  defaults: demoDefaults,
  unknownPolicy: 'reject',
  fields: [
    { path: '/tokens/seed/primaryHue', label: '主色相', type: 'hue', min: 0, max: 360, step: 1, unit: '°' },
    { path: '/tokens/seed/lightness', label: '明度', type: 'slider', min: 0.3, max: 0.9, step: 0.01 },
    {
      path: '/tokens/seed/neutral/light/temperature',
      label: '中性色温',
      type: 'select',
      options: [
        { value: 'warm', label: '暖' },
        { value: 'neutral', label: '中性' },
        { value: 'cool', label: '冷' },
      ],
    },
    {
      path: '/tokens/subset/space',
      label: '间距子集',
      type: 'multi-select',
      options: [4, 8, 12, 16, 24].map((value) => ({ value, label: String(value) })),
    },
    {
      path: '/tokens/platforms',
      label: '出口',
      type: 'multi-select',
      options: ['css', 'json', 'dtcg'].map((value) => ({ value, label: value })),
    },
    { path: '/meta/name', label: '名称', type: 'text' },
    { path: '/meta/dark', label: '暗色', type: 'switch' },
  ],
  presets: [
    {
      id: 'calm',
      label: '沉稳',
      config: {
        ...demoDefaults,
        tokens: {
          ...demoDefaults.tokens,
          seed: { ...demoDefaults.tokens.seed, primaryHue: 250, lightness: 0.5 },
        },
      },
    },
  ],
  validate(config) {
    const diagnostics = []
    if (config.tokens.seed.lightness > 0.8) {
      diagnostics.push({
        level: 'warn' as const,
        code: 'demo/lightness-bright',
        message: '明度过高，浅色模式对比度可能不足',
        path: '/tokens/seed/lightness',
      })
    }
    if (!config.tokens.subset.space.length) {
      diagnostics.push({
        level: 'error' as const,
        code: 'demo/space-empty',
        message: '间距子集不能为空',
        path: '/tokens/subset/space',
      })
    }
    return diagnostics
  },
  inspect: (config) => ({
    '--color-primary': `oklch(0.64 0.12 ${config.tokens.seed.primaryHue})`,
  }),
  preview: (config) => ({
    css: `:root { --color-primary-hue: ${config.tokens.seed.primaryHue}; }`,
    vars: { '--color-primary-hue': String(config.tokens.seed.primaryHue) },
    scenarios: [{ id: 'default', label: '默认' }],
  }),
  export: (config) => ({
    files: [
      { path: 'tokens.css', content: `:root{--color-primary-hue:${config.tokens.seed.primaryHue}}` },
      { path: 'tokens.json', content: JSON.stringify(config.tokens.seed) },
    ],
  }),
})
