// @ts-check
import { defineConfig, envField } from 'astro/config'
import sitemap from '@astrojs/sitemap'
import tailwindcss from '@tailwindcss/vite'

/**
 * Static Astro 7 (SSG). No adapter: nothing on this site renders on demand, so
 * Cloudflare serves plain files out of Workers Static Assets and never executes
 * Worker code. See docs/architecture.md.
 */
export default defineConfig({
  site: 'https://pixelferry.app',

  /*
   * Production already serves `/privacy`, and redirects both `/privacy/` and
   * `/privacy.html` to it. `format: 'file'` emits `privacy.html`, which
   * Cloudflare's default `html_handling: "auto-trailing-slash"` serves at that
   * exact URL — so every existing public URL survives the migration unchanged.
   */
  trailingSlash: 'never',
  build: {
    format: 'file',
    /*
     * Load-bearing for the CSP. 'auto' inlines small stylesheets into a
     * <style> block, which would force `style-src 'unsafe-inline'`. Keeping
     * every stylesheet external is what lets the header CSP stay hash-free
     * AND inline-free. `npm run audit:seo` asserts the output has neither.
     */
    inlineStylesheets: 'never',
  },

  /*
   * Shiki emits a `style` attribute on every syntax token, which would force
   * `style-src 'unsafe-inline'` back into the CSP and adds ~25 KB of span
   * soup to a page with three shell snippets on it. Plain <pre><code>,
   * styled in ContentLayout, costs nothing and reads fine.
   */
  markdown: { syntaxHighlight: false },

  integrations: [
    sitemap({
      // 404 is reachable but must never be offered to a crawler as content.
      filter: (page) => !page.includes('/404'),
      serialize(item) {
        // Never fake `lastmod`: a build timestamp on every URL tells Search
        // the whole site changed on every deploy, which is a lie that costs
        // trust. Real per-page dates are set in `custom-sitemap-lastmod`.
        delete item.lastmod
        delete item.changefreq
        delete item.priority
        return item
      },
    }),
  ],

  /*
   * Client-visible configuration only — this site holds no secrets. Every
   * optional value is genuinely optional: with the tracking IDs unset the
   * site ships no tag and no banner, and with the endpoint unset the waitlist
   * form degrades to a mailto: link rather than faking a signup.
   */
  env: {
    schema: {
      PUBLIC_WAITLIST_ENDPOINT: envField.string({
        context: 'client',
        access: 'public',
        optional: true,
      }),
      PUBLIC_WAITLIST_MAILTO: envField.string({
        context: 'client',
        access: 'public',
        default: 'beta@pixelferry.app',
      }),
      PUBLIC_TURNSTILE_SITEKEY: envField.string({
        context: 'client',
        access: 'public',
        optional: true,
      }),
      PUBLIC_GTM_ID: envField.string({
        context: 'client',
        access: 'public',
        optional: true,
      }),
      PUBLIC_META_PIXEL_ID: envField.string({
        context: 'client',
        access: 'public',
        optional: true,
      }),
    },
  },

  vite: {
    plugins: [tailwindcss()],
    build: {
      target: 'es2022',
      /*
       * 0 = never inline. This is the second half of the no-'unsafe-inline'
       * CSP: Astro inlines a bundled <script> chunk into the HTML when it is
       * under this limit (see astro/dist/core/build/plugins/plugin-scripts.js
       * `shouldInlineScriptChunk`), and an inline module would force
       * `script-src 'unsafe-inline'` back in. It also keeps small images as
       * real files, which costs less than base64 over HTTP/2.
       */
      assetsInlineLimit: 0,
    },
  },
})
