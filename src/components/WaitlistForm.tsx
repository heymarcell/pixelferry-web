import { useId, useRef, useState } from 'react'
import { ArrowRight, Check, LoaderCircle, Mail } from 'lucide-react'
import { AnimatePresence, m } from 'motion/react'

import { easeOutSoft } from './motion'
import { Turnstile, type TurnstileHandle } from './Turnstile'

/** Failures are separate states so each can explain what actually went wrong. */
type FailureStatus = 'error' | 'verifyFailed' | 'rateLimited'
type Status =
  | 'idle'
  | 'verifying'
  | 'submitting'
  | 'success'
  | 'mailto'
  | 'confirmed'
  | FailureStatus

const ENDPOINT = import.meta.env.VITE_WAITLIST_ENDPOINT
const MAILTO = import.meta.env.VITE_WAITLIST_MAILTO ?? 'beta@pixelferry.app'
/** 'form' posts urlencoded to a provider form endpoint (Brevo, MailerLite …). */
const FORMAT = import.meta.env.VITE_WAITLIST_FORMAT ?? 'json'
const EMAIL_FIELD = import.meta.env.VITE_WAITLIST_EMAIL_FIELD ?? 'EMAIL'
/**
 * Cloudflare Turnstile sitekey. The Worker pins this exact action via
 * TURNSTILE_EXPECTED_ACTION_WAITLIST, so the two must be changed together —
 * a mismatch fails every signup with 403 captcha_failed.
 */
const TURNSTILE_SITEKEY = import.meta.env.VITE_TURNSTILE_SITEKEY
const TURNSTILE_ACTION = 'waitlist_signup'

/*
 * Versioned so the consent record can name exactly what the visitor agreed to,
 * as the Privacy Policy §2 requires. Bump BOTH when the wording changes.
 */
const CONSENT_TEXT_VERSION = '2026-07-26.1'
const PRIVACY_POLICY_VERSION = '2026-07-25'
/** Pencil CvV1H — the design's exact consent wording. */
const CONSENT_TEXT = 'I agree to PixelFerry product and early-access emails. Unsubscribe anytime.'

/** Brevo returns the visitor here after they click the confirmation link. */
const CONFIRMED = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('confirmed')

const messages: Partial<Record<Status, string>> = {
  confirmed: "You're on the list — we'll email you when your invite is ready.",
  success: 'Almost there — check your inbox and confirm your address to join the waitlist.',
  mailto: 'Opening your email app to finish the request.',
  // Each error names what actually went wrong, so the visitor knows whether
  // retrying is worth it — a generic failure reads as "this site is broken".
  error: "That didn't go through. Please try again in a moment.",
  verifyFailed: 'We could not verify you are human. Please try again.',
  rateLimited: 'Too many attempts from this network. Please try again shortly.',
}

export function WaitlistForm() {
  const inputId = useId()
  const consentId = useId()
  const statusId = useId()
  const [email, setEmail] = useState('')
  const [consented, setConsented] = useState(false)
  const [status, setStatus] = useState<Status>(CONFIRMED ? 'confirmed' : 'idle')
  const formRef = useRef<HTMLFormElement>(null)
  const turnstileRef = useRef<TurnstileHandle>(null)

  const busy = status === 'verifying' || status === 'submitting'
  const done = status === 'success' || status === 'confirmed'

  /**
   * Restore the CTA and hand the widget a clean slate: a Turnstile token is
   * single-use, so a retry after any failure must run its own challenge.
   */
  function fail(reason: FailureStatus) {
    turnstileRef.current?.reset()
    setStatus(reason)
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy || done) return

    // The browser owns validation, so the required consent box and a malformed
    // address both surface a native message instead of a custom one.
    if (!formRef.current?.reportValidity()) return

    // Without a configured backend, hand off to the user's mail client rather
    // than faking a successful signup.
    if (!ENDPOINT) {
      setStatus('mailto')
      window.location.href = `mailto:${MAILTO}?subject=${encodeURIComponent(
        'PixelFerry beta waitlist',
      )}&body=${encodeURIComponent(`Please add ${email} to the PixelFerry beta waitlist.`)}`
      return
    }

    // Minted here rather than on page load, so the token cannot age past its
    // ~300s lifetime while the visitor reads the page. Turnstile paints its
    // widget inline at this point only if it wants an interaction.
    let turnstileToken: string | null = null
    if (TURNSTILE_SITEKEY) {
      setStatus('verifying')
      turnstileToken = (await turnstileRef.current?.execute()) ?? null
      if (!turnstileToken) return fail('verifyFailed')
    }

    setStatus('submitting')
    try {
      if (FORMAT === 'form') {
        // Provider form endpoints do not send CORS headers, so the response is
        // opaque and cannot be inspected. That is acceptable here only because
        // double opt-in means the real confirmation happens over email anyway.
        const body = new URLSearchParams({ [EMAIL_FIELD]: email })
        await fetch(ENDPOINT, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body,
        })
        setStatus('success')
        return
      }

      const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          source: 'landing',
          turnstileToken,
          consent: {
            given: true,
            text: CONSENT_TEXT,
            textVersion: CONSENT_TEXT_VERSION,
            privacyPolicyVersion: PRIVACY_POLICY_VERSION,
            at: new Date().toISOString(),
          },
        }),
      })
      if (response.ok) {
        setStatus('success')
        return
      }
      // The Worker distinguishes these; mirroring them means the visitor is
      // told to wait rather than to retry into the same rate limit.
      if (response.status === 429) return fail('rateLimited')
      if (response.status === 403) return fail('verifyFailed')
      fail('error')
    } catch {
      fail('error')
    }
  }

  return (
    <div className="flex w-full max-w-[700px] flex-col items-center gap-4">
      <form
        ref={formRef}
        noValidate
        onSubmit={handleSubmit}
        className="flex w-full flex-col gap-4"
      >
        <div className="flex w-full flex-col gap-2 rounded-lg bg-white/[0.05] p-1.5 shadow-[inset_0_0_0_1px_#FFFFFF24,0_12px_30px_-8px_#00000066] sm:h-[62px] sm:flex-row sm:items-center sm:gap-3 sm:py-0 sm:pr-1.5 sm:pl-5">
          <label htmlFor={inputId} className="sr-only">
            Email address
          </label>

          <div className="flex min-w-0 flex-1 items-center gap-2.5 px-3.5 py-3 sm:px-0 sm:py-0">
            <Mail size={18} strokeWidth={2} className="shrink-0 text-white/45" aria-hidden="true" />
            <input
              id={inputId}
              name="email"
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              spellCheck={false}
              placeholder="you@example.com"
              aria-describedby={statusId}
              value={email}
              disabled={busy || done}
              onChange={(event) => {
                setEmail(event.target.value)
                if (messages[status] && !done) setStatus('idle')
              }}
              className="w-full min-w-0 bg-transparent text-[16px] text-white outline-none placeholder:text-white/45 disabled:opacity-60"
            />
          </div>

          <button
            type="submit"
            disabled={busy || done}
            /* Pencil dln7v: h50, r6, #0062FF, pad 0/22, gap 9, label Inter 15/700. */
            className="group inline-flex h-[50px] shrink-0 items-center justify-center gap-[9px] rounded-md bg-blue px-[22px] text-[15px] font-bold text-white shadow-[0_6px_18px_-4px_#0062FF55] transition-[background-color,transform,box-shadow] duration-200 ease-out hover:bg-[#1A73FF] hover:shadow-[0_10px_26px_-6px_#0062FF80] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-80"
          >
            {busy ? (
              <LoaderCircle size={17} strokeWidth={2.5} className="animate-spin" aria-hidden="true" />
            ) : done ? (
              <Check size={17} strokeWidth={2.5} aria-hidden="true" />
            ) : null}
            {done ? "You're in" : status === 'verifying' ? 'Verifying…' : 'Join Waitlist'}
            {!busy && !done && (
              <ArrowRight
                size={17}
                strokeWidth={2.5}
                aria-hidden="true"
                className="transition-transform duration-200 ease-out group-hover:translate-x-0.5"
              />
            )}
          </button>
        </div>

        {/*
          Unticked by default and required: GDPR consent must be a positive act,
          so a pre-ticked box or an implied opt-in would not be valid consent.
        */}
        {/* Pencil gLKr2: width 668 (16px inset each side of the 700 form), gap 10. */}
        <div className="mx-auto flex w-full max-w-[668px] items-start gap-2.5 text-left">
          {/*
            Pencil fDHnu: 18px, r4, fill #FFFFFF0A, 1px #FFFFFF52. The native
            control cannot take that fill/border, so it is drawn with appearance-none
            and the tick supplied as a background image only when checked.
          */}
          <input
            id={consentId}
            name="consent"
            type="checkbox"
            required
            checked={consented}
            disabled={busy || done}
            onChange={(e) => setConsented(e.target.checked)}
            className="mt-0.5 size-[18px] shrink-0 appearance-none rounded-[4px] border border-[#FFFFFF52] bg-[#FFFFFF0A] bg-[length:12px_12px] bg-center bg-no-repeat transition-colors duration-150 checked:border-blue checked:bg-blue checked:bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22white%22 stroke-width=%223%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><polyline points=%2220 6 9 17 4 12%22/></svg>')] disabled:opacity-60"
          />
          {/* Pencil CvV1H / m3K6Q: Inter 14, #FFFFFFB8, link 14/600 #C8D8FF. */}
          <label htmlFor={consentId} className="text-[14px] leading-[1.4] text-white/72">
            {CONSENT_TEXT}{' '}
            <a
              href="/privacy"
              className="rounded font-semibold text-[#C8D8FF] underline-offset-4 hover:underline"
            >
              Privacy policy
            </a>
          </label>
        </div>
      </form>

      {TURNSTILE_SITEKEY && (
        <Turnstile sitekey={TURNSTILE_SITEKEY} action={TURNSTILE_ACTION} handleRef={turnstileRef} />
      )}

      <div id={statusId} aria-live="polite" className="min-h-0">
        <AnimatePresence mode="wait">
          {messages[status] && (
            <m.p
              key={status}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: easeOutSoft }}
              className={`text-center text-[13px] font-medium ${
                status === 'error' ? 'text-[#FF8A84]' : 'text-[#9DE8B8]'
              }`}
            >
              {messages[status]}
            </m.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
