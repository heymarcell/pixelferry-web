import { beforeAll, describe, expect, it } from 'vitest'
import { loadPages, claimSurface } from '../scripts/lib/pages.mjs'

type Page = { rel: string; all: string }

/**
 * THE PUBLISHED CONTROLLER IDENTITY.
 *
 * These values are not inferred. They are transcribed from the operator's own
 * published imprint at lenuri.com and the accompanying LEGAL-NOTES.md, which
 * record a deliberate position on what may and may not appear on a public page.
 *
 * DELIBERATELY NOT PUBLISHED, and these tests enforce it:
 *
 *   - the EIN — a tax identifier; publishing it enables tax and identity fraud
 *   - the FinCEN beneficial-ownership ID — confidential by statute
 *   - the member's personal name — a single-member LLC's imprint would tie a
 *     private individual's legal name to a public page permanently; there is no
 *     obligation to, since the entity is not EU-established
 *   - the Wyoming filing ID — public record already, and republishing it makes
 *     the entity trivially enumerable from the page
 *
 * A Wyoming LLC has no VAT number, so no VAT field is rendered at all.
 */
const ENTITY = 'neongod LLC'
const ADDRESS = '447 Broadway, 2nd Floor, New York, NY 10013, United States'

describe('published legal identity', () => {
  let legal: Page[]

  beforeAll(async () => {
    const pages = await loadPages()
    legal = pages
      .filter((p: { rel: string }) => /^(privacy|cookies)\.html$/.test(p.rel))
      .map((p: { rel: string }) => ({
        rel: p.rel,
        all: (claimSurface(p) as unknown as { all: string }).all,
      }))
    expect(legal.length).toBe(2)
  })

  it('names the controller and its principal address', () => {
    for (const page of legal) {
      expect(page.all, `${page.rel} does not name the controller`).toContain(ENTITY)
      expect(page.all, `${page.rel} does not carry the address`).toContain(ADDRESS)
    }
  })

  it('publishes no identifier that must stay private', () => {
    for (const page of legal) {
      // A US EIN is NN-NNNNNNN. No such shape may appear.
      expect(page.all, `${page.rel} may contain an EIN`).not.toMatch(/\b\d{2}-\d{7}\b/)
      // Wyoming filing IDs are long digit runs; no bare 10+ digit token.
      expect(page.all, `${page.rel} may contain a filing ID`).not.toMatch(/\b\d{10,}\b/)
      expect(page.all).not.toMatch(/\bEIN\b/i)
      expect(page.all).not.toMatch(/beneficial[- ]ownership|FinCEN/i)
      // A Wyoming LLC has no VAT number — no VAT row should render.
      expect(page.all, `${page.rel} renders a VAT field`).not.toMatch(/\bVAT\b/i)
    }
  })

  it('any remaining placeholder is disclosed by the DRAFT badge', () => {
    const PLACEHOLDER = /\[[A-Z][A-Z /]{3,}\]/g
    for (const page of legal) {
      const open = page.all.match(PLACEHOLDER) ?? []
      if (open.length > 0) {
        expect(
          page.all,
          `${page.rel} still has ${open.join(', ')} but is not marked DRAFT`,
        ).toMatch(/DRAFT/i)
      }
      // The contact mailbox is the only one still open. Anything else is a
      // regression — the entity fields are resolved and must stay resolved.
      const unexpected = open.filter((p) => p !== '[PRIVACY EMAIL ADDRESS]')
      expect(unexpected, `${page.rel} has unexpected placeholders`).toEqual([])
    }
  })

  it('states the Article 27 representative position rather than leaving it blank', () => {
    const privacy = legal.find((p) => p.rel === 'privacy.html')!
    expect(privacy.all).toMatch(/Article 27/)
    expect(privacy.all).toMatch(/not yet appointed/i)
  })
})
