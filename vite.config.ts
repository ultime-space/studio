import { defineConfig } from 'vite-plus'

const ignore = ['**/node_modules/**', '**/dist/**', '**/*.md']

/** 库出口：`vp pack` 产出 ESM 与声明；包体只发产物，不发源码。 */
export default defineConfig({
  fmt: {
    ignorePatterns: ignore,
    semi: false,
    singleQuote: true,
    trailingComma: 'all',
    printWidth: 120,
  },
  lint: {
    ignorePatterns: ignore,
    plugins: ['typescript'],
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
  },
  staged: {
    '*': 'vp check --fix',
  },
  pack: {
    entry: { index: 'src/index.ts' },
    format: 'esm',
    platform: 'node',
    target: 'node22',
    dts: true,
    // 发布产物默认压缩：注释与说明留在源码与文档，不随 dist 发布。
    minify: true,
    sourcemap: false,
    clean: true,
    publint: true,
    attw: { level: 'error' },
    unused: true,
    outExtensions: () => ({ js: '.js', dts: '.d.ts' }),
  },
})
