#!/usr/bin/env node
/**
 * Build and deploy a NON-PRODUCTION preview Worker.
 *
 * Two things make this safe to run:
 *
 *   1. `PF_NOINDEX=1` puts `<meta name="robots" content="noindex, nofollow">`
 *      on every page, so a preview can never compete with production in Search.
 *      `test/seo-output.test.ts` asserts that in both directions — the flag on
 *      AND, more importantly, the flag off for a production build.
 *
 *   2. It deploys to a DIFFERENT Worker name (`pixelferry-web-preview`) with
 *      `--name`, so it cannot touch the production Worker, and the production
 *      Worker's custom domain is not declared in wrangler.jsonc at all.
 *
 *   node scripts/deploy-preview.mjs
 */
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const NAME = process.env.PF_PREVIEW_NAME ?? 'pixelferry-web-preview'

const run = (cmd, args, env = {}) =>
  execFileSync(cmd, args, { cwd: ROOT, stdio: 'inherit', env: { ...process.env, ...env } })

console.log(`\n▸ building with PF_NOINDEX=1 for preview Worker "${NAME}"\n`)
run('npx', ['astro', 'build'], { PF_NOINDEX: '1' })

// A build that is not noindexed must never reach a preview host.
const { readFile } = await import('node:fs/promises')
const home = await readFile(path.join(ROOT, 'dist/index.html'), 'utf8')
if (!home.includes('content="noindex, nofollow"')) {
  console.error('\n✗ refusing to deploy: the preview build is not noindexed\n')
  process.exit(1)
}

console.log(`\n▸ deploying to ${NAME} (workers.dev enabled for this Worker only)\n`)
run('npx', ['wrangler', 'deploy', '--name', NAME, '--var', 'PF_ENV:preview'])

console.log('\n✓ preview deployed. Rebuild without PF_NOINDEX before any production deploy.\n')
