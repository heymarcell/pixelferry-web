import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  PRODUCT_FACTS_APP_COMMIT,
  PRODUCT_FACTS_APP_MAIN,
  PRODUCT_FACTS_APP_PENDING,
} from '../src/data/product'

const ROOT = path.dirname(import.meta.dirname)

/**
 * THE WEBSITE HAS AN OPEN UPSTREAM DEPENDENCY.
 *
 * Some product behaviour this site describes — PDF to HEIC/ICO, trim and
 * target-size on PDF pages, and HEIC output honouring the metadata policy —
 * exists only on `pixelferry-app` PR #70, which is OPEN and UNMERGED.
 *
 * A previous pass pinned that PR's commits as though they were app main, and
 * described them as having "landed", because it resolved app state from a
 * locally checked-out feature branch instead of `origin/main`. These tests make
 * that specific mistake fail loudly rather than read as a routine sync.
 *
 * They deliberately do NOT reach the network or the private repo — public CI
 * must never clone it. They check that this repo's own record of the dependency
 * stays internally consistent.
 */
describe('the upstream app dependency is recorded honestly', () => {
  it('pins a candidate that is explicitly not app main', () => {
    expect(PRODUCT_FACTS_APP_COMMIT).toMatch(/^[0-9a-f]{40}$/)
    expect(PRODUCT_FACTS_APP_MAIN).toMatch(/^[0-9a-f]{40}$/)
    expect(PRODUCT_FACTS_APP_COMMIT).not.toBe(PRODUCT_FACTS_APP_MAIN)
  })

  it('flags the pin as pending while it differs from main', () => {
    if (PRODUCT_FACTS_APP_COMMIT !== PRODUCT_FACTS_APP_MAIN) {
      expect(
        PRODUCT_FACTS_APP_PENDING.pending,
        'the pin is not app main, so it must be marked pending',
      ).toBe(true)
      expect(PRODUCT_FACTS_APP_PENDING.status).toBe('OPEN')
      expect(PRODUCT_FACTS_APP_PENDING.pr).toBe(70)
    }
  })

  it('never describes the pending commits as landed or as main', async () => {
    const files = [
      'src/data/product.ts',
      'docs/audits/public-claim-ledger-2026-08-29.md',
      'docs/content-sources.md',
      'CLAUDE.md',
    ]
    const offenders: string[] = []
    for (const file of files) {
      const text = await readFile(path.join(ROOT, file), 'utf8')
      for (const [i, line] of text.split('\n').entries()) {
        // "landed" / "current main" attached to a PR #70 commit id.
        if (
          /\b(?:61c52fa|06e780b|1627350|048a5a4)\b/.test(line) &&
          /\bland(?:ed|s)\b/i.test(line)
        ) {
          offenders.push(`${file}:${i + 1} calls a PR #70 commit "landed"`)
        }
        if (/\b048a5a4\w*\b/.test(line) && /\b(?:current\s+)?app\s+main\b/i.test(line)) {
          if (!/not\b|rather than|instead of|NOT/i.test(line)) {
            offenders.push(`${file}:${i + 1} calls 048a5a4 app main`)
          }
        }
      }
    }
    expect(offenders).toEqual([])
  })

  it('states the release sequence before any web merge', async () => {
    const product = await readFile(path.join(ROOT, 'src/data/product.ts'), 'utf8')
    expect(product).toMatch(/RELEASE SEQUENCE/)
    expect(product).toMatch(/Merge app PR #70/)
    expect(product).toMatch(/Only then consider merging web PR #2/)
  })

  it('records which claims depend on the PR and which do not', async () => {
    const product = await readFile(path.join(ROOT, 'src/data/product.ts'), 'utf8')
    expect(product).toMatch(/TRUE ON APP MAIN TODAY/)
    expect(product).toMatch(/REQUIRES PR #70 TO MERGE/)
  })
})
