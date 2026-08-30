import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

/**
 * THE CANONICAL HOST IS THE APEX.
 *
 * Both `pixelferry.app` and `www.pixelferry.app` are attached to the same Pages
 * project, so without a rule the www hostname answers 200 with the entire site.
 * Canonicals already point at the apex, so this was never an indexing
 * emergency — but a second reachable hostname splits links and shares, and
 * "the canonical tag will sort it out" is a weaker guarantee than not serving
 * the duplicate.
 *
 * `public/_redirects` is copied verbatim into `dist/` by Astro, and Cloudflare
 * Pages reads it from there. Both facts are asserted: a rule that never reaches
 * the deployed output is not a rule.
 *
 * This cannot verify the redirect actually fires — that needs a request to the
 * live www hostname, which no local build can serve. After deploying, run:
 *
 *   curl -sI https://www.pixelferry.app/privacy
 *
 * and confirm a 301 to `https://pixelferry.app/privacy`.
 */

const RULE = 'https://www.pixelferry.app/* https://pixelferry.app/:splat 301'

describe('_redirects', () => {
  it('redirects www to the apex, permanently, keeping the path', async () => {
    const src = await readFile(path.join(ROOT, 'public/_redirects'), 'utf8')
    const rules = src
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'))

    expect(rules, 'the www rule is missing or was reworded').toContain(RULE)
  })

  it('ships the file in the build output, where Pages actually reads it', async () => {
    // Astro copies public/ verbatim. If that ever changes, the rule silently
    // stops existing in production while this file still looks correct.
    const built = await readFile(path.join(ROOT, 'dist/_redirects'), 'utf8')
    expect(built).toContain(RULE)
  })

  it('uses 301 rather than 302, because the host move is permanent', async () => {
    const src = await readFile(path.join(ROOT, 'public/_redirects'), 'utf8')
    for (const line of src.split('\n')) {
      const rule = line.trim()
      if (!rule || rule.startsWith('#')) continue
      expect(rule, `${rule} is not a permanent redirect`).toMatch(/\b301$/)
    }
  })

  it('never redirects the apex itself, which would be a loop', async () => {
    const src = await readFile(path.join(ROOT, 'public/_redirects'), 'utf8')
    for (const line of src.split('\n')) {
      const rule = line.trim()
      if (!rule || rule.startsWith('#')) continue
      const [from] = rule.split(/\s+/)
      expect(from, `${from} would match the apex and loop`).not.toMatch(
        /^https:\/\/pixelferry\.app/,
      )
    }
  })
})
