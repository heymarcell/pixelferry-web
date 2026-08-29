#!/usr/bin/env node
/**
 * Regenerate `src/components/icons.ts` from the `lucide-static` package.
 *
 * The icons are vendored rather than depended on so that drawing a static SVG
 * does not require shipping a component framework. `lucide-static` is fetched
 * on demand here instead of being a devDependency — this script runs by hand
 * when an icon is added, never in CI or in the build.
 *
 *   node scripts/sync-icons.mjs
 */
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const target = path.join(root, 'src/components/icons.ts')

/** Every icon the site renders. Keep alphabetical within its group. */
const NAMES = [
  'sparkles',
  'mail',
  'arrow-right',
  'check',
  'loader-circle',
  'layers',
  'sliders-horizontal',
  'shield-check',
  'chevron-down',
  'plus',
  'scaling',
  'send',
  'settings',
  'zap',
  'circle-check',
  'copy',
  'folder-open',
  'loader',
  'play',
  'refresh-cw',
  'triangle-alert',
  'x',
  'arrow-left',
]

const work = mkdtempSync(path.join(tmpdir(), 'pf-icons-'))
const tgz = execFileSync('npm', ['pack', 'lucide-static@latest', '--silent'], {
  cwd: work,
  encoding: 'utf8',
})
  .trim()
  .split('\n')
  .pop()
execFileSync('tar', ['xzf', tgz], { cwd: work })

const version = JSON.parse(readFileSync(path.join(work, 'package/package.json'), 'utf8')).version
const iconDir = path.join(work, 'package/icons')
const available = new Set(readdirSync(iconDir))

const entries = NAMES.map((name) => {
  if (!available.has(`${name}.svg`)) throw new Error(`lucide has no icon "${name}"`)
  const raw = readFileSync(path.join(iconDir, `${name}.svg`), 'utf8')
  const inner = raw
    .replace(/^[\s\S]*?<svg[^>]*>/, '')
    .replace(/<\/svg>\s*$/, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return `  ${JSON.stringify(name)}: ${JSON.stringify(inner)},`
})

writeFileSync(
  target,
  `/**
 * Lucide icon geometry, extracted verbatim from lucide-static ${version}.
 *
 * Inlined rather than pulled in as a runtime dependency: the site rendered
 * these through \`lucide-react\`, which meant shipping React to draw static
 * SVG. The wrapper <svg> (size, stroke, linecap) is applied by Icon.astro, so
 * only the geometry lives here.
 *
 * Regenerate with \`node scripts/sync-icons.mjs\` if an icon is added.
 * Licence: ISC (lucide) — see THIRD-PARTY-NOTICES.md.
 */
export const iconPaths = {
${entries.join('\n')}
} as const

export type IconName = keyof typeof iconPaths
`,
)

console.log(`icons: ${NAMES.length} from lucide-static ${version}`)
