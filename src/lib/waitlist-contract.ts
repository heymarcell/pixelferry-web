/**
 * The wire contract between this site and `POST /v1/waitlist` on
 * api.pixelferry.app.
 *
 * EVERY constant here is pinned on the server side too. Changing one without
 * changing the Worker breaks every signup in production:
 *
 *  - `TURNSTILE_ACTION` must equal `TURNSTILE_EXPECTED_ACTION_WAITLIST` in
 *    pixelferry-app `apps/api/wrangler.jsonc`. `verifyTurnstile` rejects a
 *    mismatch, so a drift here fails every submission with 403.
 *
 *  - `CONSENT_TEXT` + `CONSENT_TEXT_VERSION` must match an entry in the
 *    server's `CONSENT_REGISTRY` (pixelferry-app `apps/api/src/lib/consent.ts`)
 *    *byte for byte*. The server compares the wording it was sent against its
 *    own copy and rejects a difference of one character with 400. The registry
 *    is append-only: new wording is a NEW version, bumped on both sides in the
 *    same change — an existing entry is never edited, because rows already
 *    reference it.
 *
 *  - `PRIVACY_POLICY_VERSION` is sent for the record but the server ignores the
 *    client's claim and stores its own registry value, so this must agree with
 *    the registry rather than lead it.
 *
 * `test/waitlist-contract.test.ts` asserts the exact request body this file
 * produces, so a careless edit fails the build rather than production.
 */

/** Cloudflare Turnstile action, pinned by the Worker. */
export const TURNSTILE_ACTION = 'waitlist_signup'

/** Identifies where a signup came from, in the stored consent record. */
export const SIGNUP_SOURCE = 'landing'

/** Pencil CvV1H — the design's exact consent wording. Do not reword. */
export const CONSENT_TEXT =
  'I agree to PixelFerry product and early-access emails. Unsubscribe anytime.'

export const CONSENT_TEXT_VERSION = '2026-07-26.1'
export const PRIVACY_POLICY_VERSION = '2026-07-25'

export interface WaitlistRequestBody {
  email: string
  source: string
  turnstileToken: string | null
  consent: {
    given: true
    text: string
    textVersion: string
    privacyPolicyVersion: string
    at: string
  }
}

/**
 * Build the exact JSON body the Worker validates.
 *
 * Pure and exported so the contract can be tested without a browser: the test
 * asserts the literal shape, not that "a request was made".
 */
export function buildWaitlistBody(
  email: string,
  turnstileToken: string | null,
  now: Date = new Date(),
): WaitlistRequestBody {
  return {
    email,
    source: SIGNUP_SOURCE,
    turnstileToken,
    consent: {
      // An unticked box must never reach the server; the form makes the
      // checkbox `required`, so reaching here means it was ticked.
      given: true,
      text: CONSENT_TEXT,
      textVersion: CONSENT_TEXT_VERSION,
      privacyPolicyVersion: PRIVACY_POLICY_VERSION,
      at: now.toISOString(),
    },
  }
}

/** Status the form can be in. Each failure is distinct so the copy can be. */
export type WaitlistStatus =
  | 'idle'
  | 'verifying'
  | 'submitting'
  | 'success'
  | 'mailto'
  | 'confirmed'
  | 'error'
  | 'verifyFailed'
  | 'rateLimited'

/**
 * Map an HTTP response to a status.
 *
 * The Worker distinguishes these, so the visitor is told to wait rather than
 * to retry straight back into the same rate limit.
 */
export function statusForResponse(status: number): WaitlistStatus {
  if (status >= 200 && status < 300) return 'success'
  if (status === 429) return 'rateLimited'
  if (status === 403) return 'verifyFailed'
  return 'error'
}

export const WAITLIST_MESSAGES: Partial<Record<WaitlistStatus, string>> = {
  confirmed: "You're on the list. We'll email you when your invite is ready.",
  success: 'Almost there. Check your inbox and confirm your address to join the waitlist.',
  mailto: 'Opening your email app to finish the request.',
  error: "That didn't go through. Please try again in a moment.",
  verifyFailed: 'We could not verify you are human. Please try again.',
  rateLimited: 'Too many attempts from this network. Please try again shortly.',
}
