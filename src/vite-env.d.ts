/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Where waitlist signups are sent. When unset, the form falls back to a mailto: link. */
  readonly VITE_WAITLIST_ENDPOINT?: string
  /** Address used by that mailto: fallback. */
  readonly VITE_WAITLIST_MAILTO?: string
  /** 'json' (default) or 'form' for provider form endpoints that take urlencoded bodies. */
  readonly VITE_WAITLIST_FORMAT?: 'json' | 'form'
  /** Field name the provider expects for the address in 'form' mode. Default 'EMAIL'. */
  readonly VITE_WAITLIST_EMAIL_FIELD?: string

  /** Google Tag Manager container. Unset = no tags, no consent banner. */
  readonly VITE_GTM_ID?: string
  /** Meta Pixel ID. Unset = no pixel. */
  readonly VITE_META_PIXEL_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
