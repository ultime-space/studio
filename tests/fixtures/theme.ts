/**
 * theme.ts — 契约测试用的最小定义（不是真实设计系统）
 * ---------------------------------------------------------------------------
 * 覆盖 hue / slider / select / multi-select / text / switch 六种字段与一个领域校验，
 * 用来验证运行时协议本身，不承载任何领域语义。
 */

import { defineConfigurator, type ConfiguratorDefinition } from '../../src/index.ts'

export interface DemoConfig {
  theme: {
    accent: {
      hue: number
      lightness: number
      tone: string
    }
    spacing: number[]
    formats: string[]
  }
  meta: {
    name: string
    dark: boolean
  }
}

export const demoDefaults: DemoConfig = {
  theme: {
    accent: {
      hue: 210,
      lightness: 0.64,
      tone: 'neutral',
    },
    spacing: [4, 8, 12, 16],
    formats: ['css', 'json'],
  },
  meta: {
    name: 'demo',
    dark: false,
  },
}

export const demoDefinition: ConfiguratorDefinition<DemoConfig> = defineConfigurator({
  id: 'demo-theme',
  title: '示例配置',
  version: '1.0.0',
  defaults: demoDefaults,
  unknownPolicy: 'reject',
  fields: [
    { path: '/theme/accent/hue', label: '主题色相', type: 'hue', min: 0, max: 360, step: 1, unit: '°' },
    { path: '/theme/accent/lightness', label: '明度', type: 'slider', min: 0.3, max: 0.9, step: 0.01 },
    {
      path: '/theme/accent/tone',
      label: '色温',
      type: 'select',
      options: [
        { value: 'warm', label: '暖' },
        { value: 'neutral', label: '中性' },
        { value: 'cool', label: '冷' },
      ],
    },
    {
      path: '/theme/spacing',
      label: '间距档位',
      type: 'multi-select',
      options: [4, 8, 12, 16, 24].map((value) => ({ value, label: String(value) })),
    },
    {
      path: '/theme/formats',
      label: '输出格式',
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
        theme: {
          ...demoDefaults.theme,
          accent: { ...demoDefaults.theme.accent, hue: 250, lightness: 0.5 },
        },
      },
    },
  ],
  validate(config) {
    const diagnostics = []
    if (config.theme.accent.lightness > 0.8) {
      diagnostics.push({
        level: 'warn' as const,
        code: 'demo/lightness-bright',
        message: '明度过高，浅色模式对比度可能不足',
        path: '/theme/accent/lightness',
      })
    }
    if (!config.theme.spacing.length) {
      diagnostics.push({
        level: 'error' as const,
        code: 'demo/space-empty',
        message: '间距档位不能为空',
        path: '/theme/spacing',
      })
    }
    return diagnostics
  },
  inspect: (config) => ({
    '--accent-hue': String(config.theme.accent.hue),
  }),
  preview: (config) => ({
    css: `:root { --accent-hue: ${config.theme.accent.hue}; }`,
    vars: { '--accent-hue': String(config.theme.accent.hue) },
    scenarios: [{ id: 'default', label: '默认' }],
  }),
  export: (config) => ({
    files: [
      { path: 'theme.css', content: `:root{--accent-hue:${config.theme.accent.hue}}` },
      { path: 'theme.json', content: JSON.stringify(config.theme.accent) },
    ],
  }),
})
