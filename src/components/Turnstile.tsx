import { useEffect, useImperativeHandle, useRef, type RefObject } from 'react'

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
const SCRIPT_ID = 'cf-turnstile-script'
/**
 * Backstop so a challenge that never answers cannot hang the CTA forever.
 *
 * Generous on purpose: under `interaction-only` a real person may have to
 * notice a checkbox appear and click it, and 20s failed them for being slow.
 * Only genuinely stuck challenges — an automated browser Turnstile silently
 * refuses to solve, say — should ever reach this.
 */
const EXECUTE_TIMEOUT_MS = 90_000

type TurnstileApi = {
  render: (
    el: HTMLElement,
    opts: {
      sitekey: string
      action?: string
      theme?: 'auto' | 'light' | 'dark'
      /** 'flexible' fills the host width (min 300px) instead of a fixed 300px. */
      size?: 'normal' | 'compact' | 'flexible'
      /** 'interaction-only' renders nothing unless a challenge must be solved. */
      appearance?: 'always' | 'execute' | 'interaction-only'
      /** 'execute' defers the challenge until execute() is called. */
      execution?: 'render' | 'execute'
      callback?: (token: string) => void
      'expired-callback'?: () => void
      'error-callback'?: () => void
    },
  ) => string
  execute: (id: string) => void
  reset: (id: string) => void
  remove: (id: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

export type TurnstileHandle = {
  /** Runs the challenge now and resolves with a fresh token, or null on failure. */
  execute: () => Promise<string | null>
  /** Clears the spent token and hides any visible challenge, ready for a retry. */
  reset: () => void
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
 * The widget is configured with `no_clearance` (set on the sitekey itself), so
 * it sets **no cookie** — which is what keeps the Cookie Policy's "no cookies"
 * statement true. It does make a request to challenges.cloudflare.com;
 * Cloudflare is already named as a sub-processor in the Privacy Policy.
 *
 * `interaction-only` + `execution: 'execute'` mean the widget is invisible and
 * idle until the form is actually submitted, and only paints a challenge for
 * traffic Cloudflare finds suspicious. That keeps the hero matching the design
 * (which has no captcha element at all) and, because the token is minted at
 * submit time, it can never age past its ~300s lifetime while the visitor reads
 * the page.
 */
export function Turnstile({
  sitekey,
  action,
  handleRef,
}: {
  sitekey: string
  action: string
  handleRef: RefObject<TurnstileHandle | null>
}) {
  const hostRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | undefined>(undefined)
  /** Resolver for the execute() call currently in flight, if any. */
  const pendingRef = useRef<((token: string | null) => void) | null>(null)

  function settle(token: string | null) {
    pendingRef.current?.(token)
    pendingRef.current = null
  }

  useImperativeHandle(handleRef, () => ({
    execute: () =>
      new Promise<string | null>((resolve) => {
        const id = widgetIdRef.current
        if (!id || !window.turnstile) return resolve(null)

        // A widget that already holds a token will not re-run, so clear it
        // first — every submit must be backed by its own fresh challenge.
        pendingRef.current = resolve
        window.turnstile.reset(id)
        window.turnstile.execute(id)

        setTimeout(() => {
          if (!pendingRef.current) return
          pendingRef.current(null)
          pendingRef.current = null
        }, EXECUTE_TIMEOUT_MS)
      }),
    reset: () => {
      const id = widgetIdRef.current
      if (id && window.turnstile) window.turnstile.reset(id)
    },
  }))

  useEffect(() => {
    let cancelled = false

    loadScript()
      .then(() => {
        if (cancelled || !hostRef.current || !window.turnstile) return
        widgetIdRef.current = window.turnstile.render(hostRef.current, {
          sitekey,
          action,
          theme: 'dark',
          // Only shown when a challenge is actually required; 'flexible' then
          // matches the 700px form rather than sitting at a fixed 300px.
          size: 'flexible',
          appearance: 'interaction-only',
          execution: 'execute',
          callback: (token) => settle(token),
          // A stale or failed token must invalidate the form, never silently pass.
          'expired-callback': () => settle(null),
          'error-callback': () => settle(null),
        })
      })
      .catch(() => settle(null))

    return () => {
      cancelled = true
      const id = widgetIdRef.current
      if (id && window.turnstile) window.turnstile.remove(id)
      widgetIdRef.current = undefined
    }
  }, [sitekey, action])

  return <div ref={hostRef} className="w-full empty:hidden" />
}
