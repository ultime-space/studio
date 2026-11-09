import { describe, expect, it } from 'vite-plus/test'
import { createConfigurator, deepEqual, StudioError, type ConfiguratorState } from '../src/index.ts'
import { demoDefaults, demoDefinition, type DemoConfig } from './fixtures/theme.ts'

describe('createConfigurator · 状态', () => {
  it('初始化为规范化后的默认值，且没有脏字段', () => {
    const controller = createConfigurator(demoDefinition)
    expect(controller.get()).toEqual(demoDefaults)
    expect(controller.getState().dirtyPaths).toEqual([])
    expect(controller.getState().canUndo).toBe(false)
    expect(controller.getState().canRedo).toBe(false)
  })

  it('set 只改一个 JSON Pointer，并通知订阅者', () => {
    const controller = createConfigurator(demoDefinition)
    const events: ConfiguratorState<DemoConfig>[] = []
    const off = controller.subscribe((state) => events.push(state))

    controller.set('/theme/accent/hue', 200)

    expect(controller.get().theme.accent.hue).toBe(200)
    expect(controller.getState().dirtyPaths).toEqual(['/theme/accent/hue'])
    expect(events).toHaveLength(1)

    off()
    controller.set('/theme/accent/hue', 201)
    expect(events).toHaveLength(1)
  })

  it('set 做字段级取值修正（数字字符串 → 数字）', () => {
    const controller = createConfigurator(demoDefinition)
    controller.set('/theme/accent/hue', '180')
    expect(controller.get().theme.accent.hue).toBe(180)
  })

  it('相同值不写入历史', () => {
    const controller = createConfigurator(demoDefinition)
    controller.set('/theme/accent/hue', 210)
    expect(controller.getState().canUndo).toBe(false)
  })

  it('set 非法 pointer 直接抛错', () => {
    const controller = createConfigurator(demoDefinition)
    expect(() => controller.set('theme/accent', 1)).toThrow(StudioError)
  })

  it('set 数组下标越界会抛错，且不写坏配置', () => {
    const controller = createConfigurator(demoDefinition)
    expect(() => controller.set('/theme/formats/9', 'dtcg')).toThrow(StudioError)
    expect(controller.get()).toEqual(demoDefaults)
  })
})

describe('createConfigurator · patch', () => {
  it('支持 replace / add / remove', () => {
    const controller = createConfigurator(demoDefinition)
    controller.patch([
      { op: 'replace', path: '/theme/accent/lightness', value: 0.7 },
      { op: 'add', path: '/theme/spacing/1', value: 6 },
      { op: 'remove', path: '/theme/formats/1' },
    ])

    expect(controller.get().theme.accent.lightness).toBe(0.7)
    expect(controller.get().theme.spacing).toEqual([4, 6, 8, 12, 16])
    expect(controller.get().theme.formats).toEqual(['css'])
  })

  it('patch 的 replace 也走字段级修正', () => {
    const controller = createConfigurator(demoDefinition)
    controller.patch([{ op: 'replace', path: '/theme/accent/hue', value: '90' }])
    expect(controller.get().theme.accent.hue).toBe(90)
  })

  it('数组下标越界会抛错，且不写坏配置', () => {
    const controller = createConfigurator(demoDefinition)
    expect(() => controller.patch([{ op: 'add', path: '/theme/formats/9', value: 'dtcg' }])).toThrow(StudioError)
    expect(controller.get()).toEqual(demoDefaults)
  })
})

describe('createConfigurator · 历史', () => {
  it('undo / redo 还原配置', () => {
    const controller = createConfigurator(demoDefinition)
    controller.set('/theme/accent/hue', 120)
    controller.set('/theme/accent/hue', 60)

    controller.undo()
    expect(controller.get().theme.accent.hue).toBe(120)
    controller.undo()
    expect(controller.get().theme.accent.hue).toBe(210)
    expect(controller.getState().canUndo).toBe(false)

    controller.redo()
    expect(controller.get().theme.accent.hue).toBe(120)
  })

  it('historyLimit 限制撤销深度', () => {
    const controller = createConfigurator(demoDefinition, { historyLimit: 2 })
    controller.set('/theme/accent/hue', 1)
    controller.set('/theme/accent/hue', 2)
    controller.set('/theme/accent/hue', 3)

    controller.undo()
    controller.undo()
    expect(controller.getState().canUndo).toBe(false)
    expect(controller.get().theme.accent.hue).toBe(2)
  })
})

describe('createConfigurator · 复位与预设', () => {
  it('reset 回到 baseline；改 baseline 后 dirtyPaths 非空', () => {
    const controller = createConfigurator(demoDefinition)
    controller.set('/theme/accent/hue', 300)
    controller.reset()
    expect(controller.get().theme.accent.hue).toBe(210)
    expect(controller.getState().dirtyPaths).toEqual([])

    controller.replace({ ...demoDefaults, meta: { ...demoDefaults.meta, name: 'changed' } })
    expect(controller.getState().dirtyPaths).toEqual(['/meta/name'])
    controller.reset({ mode: 'defaults' })
    expect(controller.get().meta.name).toBe('demo')
  })

  it('reset 带 path 只复位一个字段', () => {
    const controller = createConfigurator(demoDefinition)
    controller.set('/theme/accent/hue', 300)
    controller.set('/meta/name', 'other')
    controller.reset({ path: '/theme/accent/hue' })
    expect(controller.get().theme.accent.hue).toBe(210)
    expect(controller.get().meta.name).toBe('other')
  })

  it('applyPreset 整体替换，未知预设抛错', () => {
    const controller = createConfigurator(demoDefinition)
    controller.applyPreset('calm')
    expect(controller.get().theme.accent.hue).toBe(250)
    expect(() => controller.applyPreset('missing')).toThrow(StudioError)
  })
})

describe('createConfigurator · 校验与导出', () => {
  it('validate 汇总通用与领域诊断，并按 path 排序', async () => {
    const controller = createConfigurator(demoDefinition)
    controller.set('/theme/spacing', [])

    const diagnostics = await controller.validate()
    expect(diagnostics.map((item) => item.code)).toEqual(['demo/space-empty'])
    expect(controller.getState().diagnostics).toEqual(diagnostics)
  })

  it('范围错误会阻断导出', async () => {
    const controller = createConfigurator(demoDefinition)
    controller.set('/theme/accent/lightness', 0.95)

    const outcome = await controller.export()
    expect(outcome.ok).toBe(false)
    expect(outcome.files).toEqual([])
    expect(outcome.diagnostics.some((item) => item.code === 'field/range')).toBe(true)
  })

  it('导出成功时给出产物与 lock，且两次结果一致', async () => {
    const controller = createConfigurator(demoDefinition)
    const first = await controller.export()
    const second = await controller.export()

    expect(first.ok).toBe(true)
    expect(first.files.map((file) => file.path)).toEqual(['theme.css', 'theme.json'])
    expect(Object.keys(first.lock?.artifacts ?? {})).toEqual(['theme.css', 'theme.json'])
    expect(deepEqual(first, second)).toBe(true)
  })

  it('warn 不阻断导出', async () => {
    const controller = createConfigurator(demoDefinition)
    controller.set('/theme/accent/lightness', 0.85)
    const outcome = await controller.export()
    expect(outcome.ok).toBe(true)
    expect(outcome.diagnostics.some((item) => item.code === 'demo/lightness-bright')).toBe(true)
  })
})

describe('createConfigurator · 序列化与分享', () => {
  it('serialize / deserialize 往返，并把 baseline 重置为导入值', () => {
    const controller = createConfigurator(demoDefinition)
    controller.set('/theme/accent/hue', 42)
    const text = controller.serialize()

    const next = createConfigurator(demoDefinition)
    next.deserialize(text)
    expect(next.get()).toEqual(controller.get())
    expect(next.getState().dirtyPaths).toEqual([])
  })

  it('toURL / fromURL 往返', () => {
    const controller = createConfigurator(demoDefinition)
    controller.set('/meta/dark', true)
    const url = controller.toURL()

    const next = createConfigurator(demoDefinition)
    next.fromURL(url)
    expect(next.get()).toEqual(controller.get())
  })

  it('inspect / preview 透传定义包', () => {
    const controller = createConfigurator(demoDefinition)
    expect(controller.inspect()['--accent-hue']).toBe('210')
    expect(controller.preview()?.scenarios?.[0].id).toBe('default')
  })
})
