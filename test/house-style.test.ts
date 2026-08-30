import { beforeAll, describe, expect, it } from 'vitest'
import { loadPages, claimSurface } from '../scripts/lib/pages.mjs'

type Page = { rel: string; body: string; head: string }

/**
 * HOUSE STYLE: THE EM DASH IS NOT A GENERAL-PURPOSE CONNECTOR.
 *
 * This site shipped with **237 em dashes** in its rendered text, up to 21 on a
 * single page. Individually each one was defensible. Collectively they were the
 * single loudest tell that the prose was machine-written, because a human
 * writer varies the mark: a comma for an aside, a colon for a definition, a
 * full stop for a second thought, parentheses for a true digression. Reaching
 * for the same dash every time is what a language model does.
 *
 * The rewrite that removed them was not search-and-replace. Substituting the
 * mark mechanically produced real damage that a naive count would have called
 * success — an orphaned opening dash where only the closing one was replaced, a
 * sentence fragment ("That you were trying to clean up."), a subject left with
 * no predicate, and two lists silently merged into one. Each had to be reread
 * and rewritten. **If this test fails, fix the sentence, not the character.**
 *
 * The legal pages are exempt. `src/data/legal.ts` is transcribed verbatim from
 * the design and is pending legal review, so its wording is not ours to edit.
 */

/** Transcribed legal copy, exempt from the rule. */
const VERBATIM = /^(privacy|cookies)\.html$/

describe('house style', () => {
  let pages: Page[]

  beforeAll(async () => {
    pages = (await loadPages()).map((p: { rel: string }) => {
      const s = claimSurface(p) as unknown as { bodyText: string; headClaims: string }
      return { rel: p.rel, body: s.bodyText ?? '', head: s.headClaims ?? '' }
    })
    expect(pages.length).toBeGreaterThan(15)
  })

  it('uses no em dash in any page the project actually writes', () => {
    const offenders: string[] = []
    for (const page of pages) {
      if (VERBATIM.test(page.rel)) continue
      const hits = page.body.match(/[^.!?]*—[^.!?]*/g) ?? []
      for (const hit of hits) offenders.push(`${page.rel}: …${hit.trim().slice(0, 90)}…`)
    }
    expect(offenders, 'rewrite the sentence rather than swapping the character').toEqual([])
  })

  it('uses no em dash in a title or meta description either', () => {
    // Head metadata is prose too, and it is the prose search results show.
    const offenders = pages.filter((p) => p.head.includes('—')).map((p) => p.rel)
    expect(offenders).toEqual([])
  })

  /*
   * A count alone would pass on a page that simply lost its content, so anchor
   * the rule to pages that still have something to say.
   */
  it('still has substantial body text on every page it checks', () => {
    for (const page of pages) {
      if (page.rel === '404.html') continue
      expect(page.body.length, `${page.rel} has almost no text`).toBeGreaterThan(400)
    }
  })

  it('keeps the verbatim legal copy unedited rather than quietly rewriting it', () => {
    // The exemption exists because the wording is not ours. If these pages ever
    // contain NO em dash, someone edited copy that is pending legal review.
    const privacy = pages.find((p) => p.rel === 'privacy.html')!
    expect(privacy.body, 'privacy copy appears to have been rewritten').toContain('—')
  })
})
