import { describe, expect, it } from 'vitest'
import {
  CONSENT_TEXT,
  CONSENT_TEXT_VERSION,
  PRIVACY_POLICY_VERSION,
  SIGNUP_SOURCE,
  TURNSTILE_ACTION,
  buildWaitlistBody,
  statusForResponse,
} from '../src/lib/waitlist-contract'

/**
 * These assertions pin the wire contract with `POST /v1/waitlist` on
 * api.pixelferry.app. Each literal below is duplicated on the server side in
 * the private `pixelferry-app` repo; a change here without the matching change
 * there breaks every signup in production, so the values are asserted
 * literally rather than compared against themselves.
 */
describe('waitlist contract', () => {
  it('pins the Turnstile action the Worker expects', () => {
    // pixelferry-app apps/api/wrangler.jsonc → TURNSTILE_EXPECTED_ACTION_WAITLIST.
    // verifyTurnstile rejects a mismatch, so a drift 403s every signup.
    expect(TURNSTILE_ACTION).toBe('waitlist_signup')
  })

  it('pins the consent wording byte for byte', () => {
    // pixelferry-app apps/api/src/lib/consent.ts → CONSENT_REGISTRY['2026-07-26.1'].
    // The server compares the submitted text against its own copy and rejects
    // a difference of ONE character with 400 bad_request.
    expect(CONSENT_TEXT).toBe(
      'I agree to PixelFerry product and early-access emails. Unsubscribe anytime.',
    )
    expect(CONSENT_TEXT_VERSION).toBe('2026-07-26.1')
    expect(PRIVACY_POLICY_VERSION).toBe('2026-07-25')
  })

  it('renders the consent text the form actually shows', async () => {
    // The label and the payload must be the same string, or the stored
    // proof-of-consent record is a paraphrase of what the visitor agreed to.
    const form = await import('node:fs/promises').then((fs) =>
      fs.readFile(new URL('../src/components/forms/WaitlistForm.astro', import.meta.url), 'utf8'),
    )
    expect(form).toContain('{CONSENT_TEXT}')
  })

  it('builds exactly the body the Worker validates', () => {
    const at = new Date('2026-08-29T10:00:00.000Z')
    expect(buildWaitlistBody('someone@example.test', 'tok_abc', at)).toEqual({
      email: 'someone@example.test',
      source: 'landing',
      turnstileToken: 'tok_abc',
      consent: {
        given: true,
        text: 'I agree to PixelFerry product and early-access emails. Unsubscribe anytime.',
        textVersion: '2026-07-26.1',
        privacyPolicyVersion: '2026-07-25',
        at: '2026-08-29T10:00:00.000Z',
      },
    })
  })

  it('always sends consent.given as literal true', () => {
    // validateWaitlistPayload hard-rejects anything but `true`.
    const body = buildWaitlistBody('a@b.test', 't')
    expect(body.consent.given).toBe(true)
  })

  it('sends the source the consent record is keyed on', () => {
    expect(SIGNUP_SOURCE).toBe('landing')
    expect(buildWaitlistBody('a@b.test', 't').source).toBe('landing')
  })

  it('emits an ISO-8601 timestamp the server can parse', () => {
    const { consent } = buildWaitlistBody('a@b.test', 't')
    expect(consent.at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
    expect(Number.isFinite(Date.parse(consent.at))).toBe(true)
  })

  it('carries a null token through when Turnstile is not configured', () => {
    // Local dev without a sitekey still posts; the Worker rejects it, which is
    // the correct outcome — the form must not fake a success.
    expect(buildWaitlistBody('a@b.test', null).turnstileToken).toBeNull()
  })

  describe('response mapping', () => {
    it.each([
      [202, 'success'],
      [200, 'success'],
      [403, 'verifyFailed'],
      [429, 'rateLimited'],
      [400, 'error'],
      [500, 'error'],
      [502, 'error'],
    ])('maps %i to %s', (status, expected) => {
      expect(statusForResponse(status)).toBe(expected)
    })
  })
})
