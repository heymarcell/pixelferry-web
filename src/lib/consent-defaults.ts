/**
 * Google Consent Mode v2 defaults.
 *
 * Everything non-essential starts DENIED and is only ever raised by an
 * explicit opt-in. This must run before any Google tag could; since GTM is
 * injected only from `consent.ts` after a positive choice, a bundled module in
 * <head> is early enough — and being a bundled module rather than an inline
 * <script> is what lets `script-src` drop 'unsafe-inline'.
 *
 * Imported only when a tag ID is configured (see BaseLayout), so the default
 * untracked build ships none of this.
 */
declare global {
  interface Window {
    dataLayer?: unknown[]
  }
}

window.dataLayer = window.dataLayer ?? []
function gtag(...args: unknown[]) {
  window.dataLayer!.push(args)
}

gtag('consent', 'default', {
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
  analytics_storage: 'denied',
  functionality_storage: 'granted',
  security_storage: 'granted',
  wait_for_update: 500,
})

export {}
