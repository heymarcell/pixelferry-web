import { useEffect, useRef } from 'react'

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
const SCRIPT_ID = 'cf-turnstile-script'

type TurnstileApi = {
  render: (
    el: HTMLElement,
    opts: {
      sitekey: string
      action?: string
      theme?: 'auto' | 'light' | 'dark'
      /** 'flexible' fills the host width (min 300px) instead of a fixed 300px. */
      size?: 'normal' | 'compact' | 'flexible'
      callback?: (token: string) => void
      'expired-callback'?: () => void
      'error-callback'?: () => void
    },
  ) => string
  reset: (id: string) => void
  remove: (id: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

/** Loads the Turnstile script once, even if several widgets mount. */
function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve()
  const existing = document.getElementById(SCRIPT_ID)
  if (existing) return new Promise((res) => existing.addEventListener('load', () => res()))

  return new Promise((res, rej) => {
    const s = document.createElement('script')
    s.id = SCRIPT_ID
    s.src = SCRIPT_SRC
    s.async = true
    s.defer = true
    s.onload = () => res()
    s.onerror = () => rej(new Error('turnstile failed to load'))
    document.head.appendChild(s)
  })
}

/**
 * Cloudflare Turnstile, rendered explicitly so the token is handed straight to
 * the form rather than read out of a hidden input.
 *
 * The widget is configured with `no_clearance`, so it sets **no cookie** — which
 * is what keeps the Cookie Policy's "no cookies" statement true. It does make a
 * request to challenges.cloudflare.com; Cloudflare is already named as a
 * sub-processor in the Privacy Policy.
 */
export function Turnstile({
  sitekey,
  action,
  onToken,
}: {
  sitekey: string
  action: string
  onToken: (token: string | null) => void
}) {
  const hostRef = useRef<HTMLDivElement>(null)
  // Keep the newest callback without re-rendering the widget, which would
  // otherwise tear down and re-issue a challenge on every keystroke. The
  // assignment happens in an effect, not during render — mutating a ref while
  // rendering is unsafe under concurrent rendering.
  const onTokenRef = useRef(onToken)
  useEffect(() => {
    onTokenRef.current = onToken
  }, [onToken])

  useEffect(() => {
    let widgetId: string | undefined
    let cancelled = false

    loadScript()
      .then(() => {
        if (cancelled || !hostRef.current || !window.turnstile) return
        widgetId = window.turnstile.render(hostRef.current, {
          sitekey,
          action,
          theme: 'dark',
          // Fixed-width 'normal' rendered a 300px box under a 700px form, so the
          // widget read as misaligned against the full-width input and consent
          // row. 'flexible' makes it span the host instead.
          size: 'flexible',
          callback: (token) => onTokenRef.current(token),
          // A stale or failed token must invalidate the form, never silently pass.
          'expired-callback': () => onTokenRef.current(null),
          'error-callback': () => onTokenRef.current(null),
        })
      })
      .catch(() => onTokenRef.current(null))

    return () => {
      cancelled = true
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId)
    }
  }, [sitekey, action])

  return <div ref={hostRef} className="w-full" />
}
