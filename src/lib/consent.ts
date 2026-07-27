/*
 * Consent gate for non-essential tags (GA4 via GTM, Meta Pixel).
 *
 * Rules this file exists to enforce:
 *  - Prior blocking. No analytics/marketing tag makes a network call before the
 *    visitor actively opts in. GTM and the Meta Pixel are injected on consent,
 *    never on page load.
 *  - Google Consent Mode v2. The four signals default to `denied` in a snippet
 *    inlined in <head> (see index.html) so they are set before any Google tag
 *    could run; this module only ever *updates* them.
 *  - Withdrawal. Choices are re-openable from the footer and revoking marketing
 *    consent updates the signals immediately.
 *
 * Storing the choice itself is strictly necessary (it is what makes refusal
 * persist), so it needs no consent of its own.
 */

export type ConsentCategory = 'analytics' | 'marketing'

/** Footer and cookie policy dispatch this to re-open the banner, so consent stays withdrawable. */
export const OPEN_SETTINGS_EVENT = 'pf:open-cookie-settings'

export function openCookieSettings() {
  window.dispatchEvent(new CustomEvent(OPEN_SETTINGS_EVENT))
}

export type ConsentState = {
  /** Bumped when the categories or tag list change, which re-prompts everyone. */
  v: number
  analytics: boolean
  marketing: boolean
  /** ISO timestamp of the decision — the proof-of-consent record. */
  ts: string
}

export const CONSENT_VERSION = 1
const STORAGE_KEY = 'pf-consent'

/** Tags stay dormant unless these are configured, so the default build ships untracked. */
export const GTM_ID = import.meta.env.VITE_GTM_ID
export const META_PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID
export const TRACKING_CONFIGURED = Boolean(GTM_ID || META_PIXEL_ID)

type ConsentSignal = 'granted' | 'denied'

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
    fbq?: ((...args: unknown[]) => void) & { callMethod?: (...args: unknown[]) => void; queue?: unknown[] }
    _fbq?: unknown
  }
}

export function readConsent(): ConsentState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as ConsentState
    // A version bump invalidates old decisions rather than silently reusing them.
    return parsed?.v === CONSENT_VERSION ? parsed : null
  } catch {
    return null
  }
}

function persist(state: ConsentState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Storage can be unavailable (private mode, blocked). Consent then simply
    // does not persist — which fails closed, since nothing loads without it.
  }
}

/** Push the four Consent Mode v2 signals. Google requires all four in the EEA. */
function updateGoogleConsent(analytics: boolean, marketing: boolean) {
  const grant = (ok: boolean): ConsentSignal => (ok ? 'granted' : 'denied')
  window.dataLayer = window.dataLayer ?? []
  const gtag: (...args: unknown[]) => void =
    window.gtag ??
    function gtagShim(...args: unknown[]) {
      window.dataLayer!.push(args)
    }
  window.gtag = gtag
  gtag('consent', 'update', {
    analytics_storage: grant(analytics),
    ad_storage: grant(marketing),
    ad_user_data: grant(marketing),
    ad_personalization: grant(marketing),
  })
}

let gtmLoaded = false
function loadGtm() {
  if (gtmLoaded || !GTM_ID) return
  gtmLoaded = true
  window.dataLayer = window.dataLayer ?? []
  window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' })
  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(GTM_ID)}`
  document.head.appendChild(script)
}

let pixelLoaded = false
function loadMetaPixel() {
  if (pixelLoaded || !META_PIXEL_ID) return
  pixelLoaded = true
  /* Meta's stub, inlined so nothing is requested until this point. */
  const fbq = function (...args: unknown[]) {
    if (fbq.callMethod) {
      fbq.callMethod(...args)
    } else {
      fbq.queue!.push(args)
    }
  } as NonNullable<Window['fbq']>
  fbq.queue = []
  window.fbq = window.fbq ?? fbq
  window._fbq = window._fbq ?? fbq
  const script = document.createElement('script')
  script.async = true
  script.src = 'https://connect.facebook.net/en_US/fbevents.js'
  document.head.appendChild(script)
  window.fbq('init', META_PIXEL_ID)
  window.fbq('track', 'PageView')
}

/**
 * Apply a decision: update Consent Mode, then load only what was granted.
 * Tags already injected cannot be un-injected — revoking marketing consent
 * updates the signals and takes effect fully on the next page load, which is
 * why `reload` is passed when a granted category is withdrawn.
 */
export function applyConsent(state: ConsentState) {
  updateGoogleConsent(state.analytics, state.marketing)
  if (state.analytics || state.marketing) loadGtm()
  if (state.marketing) loadMetaPixel()
}

export function saveConsent(choice: Record<ConsentCategory, boolean>): ConsentState {
  const previous = readConsent()
  const state: ConsentState = {
    v: CONSENT_VERSION,
    analytics: choice.analytics,
    marketing: choice.marketing,
    ts: new Date().toISOString(),
  }
  persist(state)
  applyConsent(state)

  // Withdrawing a category that had already loaded its tag requires a reload to
  // actually stop it; granting never does.
  const withdrew =
    (previous?.analytics && !state.analytics) || (previous?.marketing && !state.marketing)
  if (withdrew) window.location.reload()

  return state
}

/** Re-apply a stored decision on boot. Returns null when the visitor must be asked. */
export function initConsent(): ConsentState | null {
  const stored = readConsent()
  if (stored) applyConsent(stored)
  return stored
}
