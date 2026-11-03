import { defineConfig } from 'vite-plus'

const ignore = ['**/node_modules/**', '**/dist/**', '**/*.md']

/** 库出口：把 TS 源码打成无依赖 ESM；Node 不支持剥离 node_modules 下的类型，所以发的是产物。 */
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
  build: {
    target: 'node22',
    minify: false,
    emptyOutDir: true,
    lib: {
      entry: { index: 'src/index.ts' },
      formats: ['es'],
    },
    rollupOptions: {
      external: [/^node:/],
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
      },
    },
  },
})
