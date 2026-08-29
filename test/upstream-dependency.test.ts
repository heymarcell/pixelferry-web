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
 * THE CROSS-REPOSITORY PIN MUST DESCRIBE ITSELF HONESTLY.
 *
 * Three things went wrong across successive passes, and each is guarded here:
 *
 *   1. A pass pinned `f6bd954` and `1627350` as app main. They were pre-rebase
 *      commits on a locally checked-out feature branch, existing on no remote.
 *      It had read the local checkout instead of `origin/main`.
 *   2. A pass then correctly identified those commits as belonging to OPEN
 *      PR #70 — but the documents still described them as merged.
 *   3. The PR's head moved from the audited `048a5a4` to `5e0d58a` before
 *      merging, so even a correctly-identified candidate was not what shipped.
 *
 * These tests do NOT reach the network or the private repo — public CI must
 * never clone it. They check that this repo's own record stays internally
 * consistent, in both directions.
 */
describe('the app snapshot describes itself honestly', () => {
  it('records both SHAs in full', () => {
    expect(PRODUCT_FACTS_APP_COMMIT).toMatch(/^[0-9a-f]{40}$/)
    expect(PRODUCT_FACTS_APP_MAIN).toMatch(/^[0-9a-f]{40}$/)
  })

  /*
   * The invariant runs BOTH ways. A candidate pin cannot be presented as
   * released, and a released pin cannot be left flagged as pending.
   */
  it('agrees with itself about whether the pin is released', () => {
    if (PRODUCT_FACTS_APP_PENDING.pending) {
      expect(
        PRODUCT_FACTS_APP_COMMIT,
        'flagged pending, so the pin must differ from main',
      ).not.toBe(PRODUCT_FACTS_APP_MAIN)
      expect(PRODUCT_FACTS_APP_PENDING.status).toBe('OPEN')
    } else {
      expect(PRODUCT_FACTS_APP_COMMIT, 'not flagged pending, so the pin must BE main').toBe(
        PRODUCT_FACTS_APP_MAIN,
      )
      expect(PRODUCT_FACTS_APP_PENDING.status).toBe('MERGED')
    }
  })

  it('never presents a superseded SHA as the current app main', async () => {
    // Every SHA this project has wrongly pinned at some point.
    const SUPERSEDED = ['f6bd954', '1627350', '048a5a4', '3309d0b', 'e3f3fbf', '5e0d58a']
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
        if (!SUPERSEDED.some((sha) => line.includes(sha))) continue
        // Naming one of these is fine in a historical note; asserting it IS the
        // current main is not.
        if (/\b(?:current|now|today'?s?)\s+(?:app\s+)?main\b/i.test(line)) {
          offenders.push(`${file}:${i + 1}`)
        }
      }
    }
    expect(offenders).toEqual([])
  })

  it('carries a re-sync procedure that reads origin/main, not a checkout', async () => {
    const product = await readFile(path.join(ROOT, 'src/data/product.ts'), 'utf8')
    expect(product).toMatch(/RE-SYNC PROCEDURE/)
    expect(product).toMatch(/rev-parse origin\/main/)
    expect(product).toMatch(/never a local checkout/)
  })

  it('keeps the record of why the pin exists', async () => {
    const product = await readFile(path.join(ROOT, 'src/data/product.ts'), 'utf8')
    // A candidate head can move before it merges — the lesson that cost a pass.
    expect(product).toMatch(/before it merges|before merging/)
  })
})
