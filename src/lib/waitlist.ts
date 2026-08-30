import {
  PUBLIC_TURNSTILE_SITEKEY,
  PUBLIC_WAITLIST_ENDPOINT,
  PUBLIC_WAITLIST_MAILTO,
} from 'astro:env/client'
import {
  TURNSTILE_ACTION,
  WAITLIST_MESSAGES,
  buildWaitlistBody,
  statusForResponse,
  type WaitlistStatus,
} from './waitlist-contract'

/**
 * Progressive enhancement for the waitlist form.
 *
 * The form is real, server-rendered HTML: it has a method, an action-less
 * submit, a required email field and a required consent checkbox, so the
 * browser validates it and it is fully readable with this module absent. This
 * only upgrades the submit into a fetch + Turnstile challenge.
 */

type TurnstileApi = {
  render: (
    el: HTMLElement,
    opts: {
      sitekey: string
      action?: string
      theme?: 'auto' | 'light' | 'dark'
      size?: 'normal' | 'compact' | 'flexible'
      appearance?: 'always' | 'execute' | 'interaction-only'
      execution?: 'render' | 'execute'
      callback?: (token: string) => void
      'expired-callback'?: () => void
      'error-callback'?: () => void
    },
  ) => string
  execute: (id: string) => void
  reset: (id: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
const SCRIPT_ID = 'cf-turnstile-script'

/**
 * Generous on purpose: under `interaction-only` a real person may have to
 * notice a checkbox appear and click it, and a short timeout failed them for
 * being slow. Only a genuinely stuck challenge should reach this.
 */
const EXECUTE_TIMEOUT_MS = 90_000

export function initWaitlistForm(form: HTMLFormElement): void {
  const email = form.querySelector<HTMLInputElement>('input[type="email"]')
  const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]')
  const consent = form.querySelector<HTMLInputElement>('input[type="checkbox"]')
  const statusEl = form.querySelector<HTMLElement>('[data-waitlist-status]')
  const labelEl = form.querySelector<HTMLElement>('[data-waitlist-label]')
  const turnstileHost = form.querySelector<HTMLElement>('[data-turnstile-host]')
  if (!email || !submit || !consent || !statusEl || !labelEl) return

  let status: WaitlistStatus = 'idle'

  /* Brevo returns the visitor here after they click the confirmation link. */
  if (new URLSearchParams(window.location.search).has('confirmed')) {
    setStatus('confirmed')
  }

  function setStatus(next: WaitlistStatus) {
    status = next
    const busy = next === 'verifying' || next === 'submitting'
    const done = next === 'success' || next === 'confirmed'

    email!.disabled = busy || done
    consent!.disabled = busy || done
    submit!.disabled = busy || done
    submit!.dataset.state = busy ? 'busy' : done ? 'done' : 'idle'
    labelEl!.textContent = done
      ? "You're in"
      : next === 'verifying'
        ? 'Verifying…'
        : 'Join Waitlist'

    const message = WAITLIST_MESSAGES[next]
    statusEl!.textContent = message ?? ''
    statusEl!.dataset.tone =
      next === 'error' || next === 'verifyFailed' || next === 'rateLimited' ? 'bad' : 'good'
  }

  // Typing after a failure clears the message, so a stale error never sits
  // under a field the visitor has already corrected.
  email.addEventListener('input', () => {
    if (status === 'success' || status === 'confirmed') return
    if (WAITLIST_MESSAGES[status]) setStatus('idle')
  })

  // ─── Turnstile ────────────────────────────────────────────────────────────
  //
  // The script is fetched on FIRST INTERACTION with the form, not on page load,
  // so an initial page view makes zero third-party requests. The token itself
  // is still minted at submit time, so it cannot age past its ~300s lifetime
  // while the visitor reads the page.

  let widgetId: string | undefined
  let scriptPromise: Promise<void> | undefined
  let pending: ((token: string | null) => void) | null = null

  function settle(token: string | null) {
    pending?.(token)
    pending = null
  }

  function loadScript(): Promise<void> {
    if (window.turnstile) return Promise.resolve()
    if (scriptPromise) return scriptPromise

    scriptPromise = new Promise<void>((resolve, reject) => {
      const existing = document.getElementById(SCRIPT_ID)
      if (existing) {
        existing.addEventListener('load', () => resolve())
        existing.addEventListener('error', () => reject(new Error('turnstile failed to load')))
        return
      }
      const script = document.createElement('script')
      script.id = SCRIPT_ID
      script.src = SCRIPT_SRC
      script.async = true
      script.defer = true
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('turnstile failed to load'))
      document.head.appendChild(script)
    })
    return scriptPromise
  }

  async function ensureWidget(): Promise<boolean> {
    if (!PUBLIC_TURNSTILE_SITEKEY || !turnstileHost) return false
    if (widgetId) return true
    try {
      await loadScript()
    } catch {
      return false
    }
    if (!window.turnstile || widgetId) return Boolean(widgetId)

    /*
     * `interaction-only` + `execution: 'execute'` keep the widget invisible and
     * idle until submit, painting a challenge only for traffic Cloudflare finds
     * suspicious — which is what keeps the hero matching the design. The
     * sitekey itself carries `no_clearance`, so no cookie is ever set, which is
     * what keeps the Cookie Policy's "no cookies" statement true.
     */
    widgetId = window.turnstile.render(turnstileHost, {
      sitekey: PUBLIC_TURNSTILE_SITEKEY,
      action: TURNSTILE_ACTION,
      theme: 'dark',
      size: 'flexible',
      appearance: 'interaction-only',
      execution: 'execute',
      callback: (token) => settle(token),
      // A stale or failed token must invalidate the form, never silently pass.
      'expired-callback': () => settle(null),
      'error-callback': () => settle(null),
    })
    return true
  }

  // Warm the script as soon as the visitor engages, so the submit is not the
  // first time we touch the network.
  form.addEventListener('focusin', () => void ensureWidget(), { once: true })

  function runChallenge(): Promise<string | null> {
    return new Promise((resolve) => {
      if (!widgetId || !window.turnstile) return resolve(null)
      // A widget holding a token will not re-run, so clear it first: every
      // submit must be backed by its own fresh challenge.
      pending = resolve
      window.turnstile.reset(widgetId)
      window.turnstile.execute(widgetId)
      window.setTimeout(() => {
        if (pending) settle(null)
      }, EXECUTE_TIMEOUT_MS)
    })
  }

  function resetChallenge() {
    if (widgetId && window.turnstile) window.turnstile.reset(widgetId)
  }

  /** Restore the CTA and hand the widget a clean slate for a retry. */
  function fail(reason: Extract<WaitlistStatus, 'error' | 'verifyFailed' | 'rateLimited'>) {
    resetChallenge()
    setStatus(reason)
  }

  // ─── Submit ───────────────────────────────────────────────────────────────

  form.addEventListener('submit', async (event) => {
    event.preventDefault()
    if (status === 'verifying' || status === 'submitting') return
    if (status === 'success' || status === 'confirmed') return

    // The browser owns validation, so the required consent box and a malformed
    // address both surface a native message instead of a custom one.
    if (!form.reportValidity()) return

    const address = email.value.trim()

    // Without a configured backend, hand off to the visitor's mail client
    // rather than faking a successful signup.
    if (!PUBLIC_WAITLIST_ENDPOINT) {
      setStatus('mailto')
      window.location.href =
        `mailto:${PUBLIC_WAITLIST_MAILTO}` +
        `?subject=${encodeURIComponent('PixelFerry beta waitlist')}` +
        `&body=${encodeURIComponent(`Please add ${address} to the PixelFerry beta waitlist.`)}`
      return
    }

    let token: string | null = null
    if (PUBLIC_TURNSTILE_SITEKEY) {
      setStatus('verifying')
      const ready = await ensureWidget()
      token = ready ? await runChallenge() : null
      if (!token) return fail('verifyFailed')
    }

    setStatus('submitting')
    try {
      const response = await fetch(PUBLIC_WAITLIST_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildWaitlistBody(address, token)),
      })
      const next = statusForResponse(response.status)
      if (next === 'success') {
        setStatus('success')
        return
      }
      fail(next as 'error' | 'verifyFailed' | 'rateLimited')
    } catch {
      fail('error')
    }
  })
}
