import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vite-plus/test'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const SELF = path.join(ROOT, 'tests/neutral.test.ts')

const DOCS = ['README.md', 'AGENTS.md', 'CONTRIBUTING.md', 'CHANGELOG.md', 'SKILLS.md', 'llms.txt']

/** 本包是上游通用运行时：不出现其它包的名称或领域示例。 */
const FORBIDDEN = [
  /@ultime\/(?:core|kit|viewer|cli)\b/,
  /\btokens\.subset\b/,
  /\/tokens\/seed\//,
  /\btokens\.(?:css|json|dtcg\.json)\b/,
]

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    return entry.isDirectory() ? walk(full) : [full]
  })
}

function files(): string[] {
  return [
    ...DOCS.map((name) => path.join(ROOT, name)),
    ...walk(path.join(ROOT, 'rules')).filter((file) => file.endsWith('.md')),
    ...walk(path.join(ROOT, 'src')).filter((file) => file.endsWith('.ts')),
    ...walk(path.join(ROOT, 'tests')).filter((file) => file.endsWith('.ts')),
  ].filter((file) => file !== SELF)
}

describe('包内容边界', () => {
  it('不包含其它包的名称或领域示例', () => {
    const hits: string[] = []
    for (const file of files()) {
      const text = fs.readFileSync(file, 'utf8')
      for (const pattern of FORBIDDEN) {
        if (pattern.test(text)) hits.push(`${path.relative(ROOT, file)}: ${pattern}`)
      }
    }
    expect(hits).toEqual([])
  })
})
