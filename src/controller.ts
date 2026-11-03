/**
 * controller.ts — 有状态控制器（草稿 / 基线 / 撤销 / 校验 / 导出）
 * ---------------------------------------------------------------------------
 * 所有变更都产出新对象，已发布的状态不会被就地改写：上游可以安全地持有 `state.config`。
 * `set` 只改一个 JSON Pointer，不自动重算诊断；需要时由上游显式调 `validate()`。
 */

import type { ConfiguratorDefinition } from './definition.ts'
import { validateConfig } from './diagnostics.ts'
import { StudioError } from './errors.ts'
import { exportConfig } from './export.ts'
import { cloneJson, deepEqual } from './json.ts'
import { coerceFieldValue, normalizeConfig, type NormalizeOptions } from './normalize.ts'
import { decodeURL, deserializeConfig, encodeURL, serializeConfig } from './persistence.ts'
import { applyPatch, diffPaths, getAt, parsePointer, removeAt, setAt } from './pointer.ts'
import { previewConfig, type PreviewModel } from './preview.ts'
import type { ConfigPatch, Diagnostic, ExportOutcome } from './types.ts'

export interface ConfiguratorState<TConfig> {
  config: TConfig
  /** 上次导入 / 保存的配置；`reset({ mode: 'baseline' })` 回到这里 */
  baseline: TConfig
  /** 与 baseline 不同的叶子路径 */
  dirtyPaths: readonly string[]
  diagnostics: readonly Diagnostic[]
  canUndo: boolean
  canRedo: boolean
}

export interface ResetOptions {
  /** 默认 `baseline`；`defaults` 回到定义默认值 */
  mode?: 'baseline' | 'defaults'
  /** 只复位一个字段 */
  path?: string
}

export interface ConfiguratorController<TConfig> {
  readonly definition: ConfiguratorDefinition<TConfig>
  get(): TConfig
  getState(): ConfiguratorState<TConfig>
  set(path: string, value: unknown): void
  patch(patch: ConfigPatch): void
  replace(config: TConfig): void
  reset(options?: ResetOptions): void
  applyPreset(id: string): void
  undo(): void
  redo(): void
  subscribe(listener: (state: ConfiguratorState<TConfig>) => void): () => void
  validate(): Promise<readonly Diagnostic[]>
  export(): Promise<ExportOutcome>
  serialize(): string
  deserialize(input: string, options?: NormalizeOptions): void
  toURL(): string
  fromURL(url: string): void
  inspect(): Record<string, unknown>
  preview(): PreviewModel | undefined
}

export interface ConfiguratorOptions<TConfig> {
  config?: TConfig
  baseline?: TConfig
  /** 撤销栈上限，默认 50 */
  historyLimit?: number
}

const DEFAULT_HISTORY_LIMIT = 50

export function createConfigurator<TConfig>(
  definition: ConfiguratorDefinition<TConfig>,
  options: ConfiguratorOptions<TConfig> = {},
): ConfiguratorController<TConfig> {
  const historyLimit = Math.max(1, options.historyLimit ?? DEFAULT_HISTORY_LIMIT)
  const fields = new Map(definition.fields.map((field) => [field.path, field]))
  const listeners = new Set<(state: ConfiguratorState<TConfig>) => void>()

  let config = normalizeConfig(definition, options.config ?? definition.defaults)
  let baseline = options.baseline === undefined ? config : normalizeConfig(definition, options.baseline)
  let diagnostics: readonly Diagnostic[] = []
  let history: TConfig[] = [config]
  let cursor = 0

  const getState = (): ConfiguratorState<TConfig> => ({
    config,
    baseline,
    dirtyPaths: diffPaths(baseline, config),
    diagnostics,
    canUndo: cursor > 0,
    canRedo: cursor < history.length - 1,
  })

  const notify = (): void => {
    const state = getState()
    for (const listener of [...listeners]) listener(state)
  }

  const commit = (next: TConfig): void => {
    if (deepEqual(next, config)) return
    config = next
    const kept = [...history.slice(0, cursor + 1), next]
    history = kept.length > historyLimit ? kept.slice(kept.length - historyLimit) : kept
    cursor = history.length - 1
    notify()
  }

  const load = (next: TConfig): void => {
    config = next
    baseline = next
    history = [next]
    cursor = 0
    diagnostics = []
    notify()
  }

  const set = (path: string, value: unknown): void => {
    parsePointer(path)
    const field = fields.get(path)
    const nextValue = field ? coerceFieldValue(field, value) : value
    if (deepEqual(getAt(config, path), nextValue)) return
    const next = cloneJson(config)
    setAt(next, path, nextValue)
    commit(next)
  }

  const patch = (operations: ConfigPatch): void => {
    const next = applyPatch(config, operations)
    for (const operation of operations) {
      const field = fields.get(operation.path)
      if (field && operation.op !== 'remove' && operation.value !== undefined) {
        setAt(next, operation.path, coerceFieldValue(field, operation.value))
      }
    }
    commit(next)
  }

  const replace = (next: TConfig): void => {
    commit(normalizeConfig(definition, next))
  }

  const reset = (resetOptions: ResetOptions = {}): void => {
    const source = resetOptions.mode === 'defaults' ? definition.defaults : baseline
    if (!resetOptions.path) {
      commit(normalizeConfig(definition, source))
      return
    }

    const next = cloneJson(config)
    const value = getAt(source, resetOptions.path)
    if (value === undefined) removeAt(next, resetOptions.path)
    else setAt(next, resetOptions.path, cloneJson(value))
    commit(normalizeConfig(definition, next))
  }

  const applyPreset = (id: string): void => {
    const preset = (definition.presets ?? []).find((item) => item.id === id)
    if (!preset) throw new StudioError('preset/missing', `没有预设：${id}`)
    commit(normalizeConfig(definition, preset.config))
  }

  const undo = (): void => {
    if (cursor <= 0) return
    cursor -= 1
    config = history[cursor]
    notify()
  }

  const redo = (): void => {
    if (cursor >= history.length - 1) return
    cursor += 1
    config = history[cursor]
    notify()
  }

  const validate = async (): Promise<readonly Diagnostic[]> => {
    diagnostics = await validateConfig(definition, config, { mode: 'edit' })
    notify()
    return diagnostics
  }

  const runExport = async (): Promise<ExportOutcome> => {
    const outcome = await exportConfig(definition, config)
    diagnostics = outcome.diagnostics
    notify()
    return outcome
  }

  return {
    definition,
    get: () => config,
    getState,
    set,
    patch,
    replace,
    reset,
    applyPreset,
    undo,
    redo,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    validate,
    export: runExport,
    serialize: () => serializeConfig(definition, config),
    deserialize: (input, normalizeOptions) => {
      load(deserializeConfig(definition, input, normalizeOptions))
    },
    toURL: () => encodeURL(definition, config),
    fromURL: (url) => {
      load(decodeURL(definition, url))
    },
    inspect: () => definition.inspect?.(config) ?? {},
    preview: () => previewConfig(definition, config),
  }
}
