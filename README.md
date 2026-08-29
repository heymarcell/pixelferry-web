# pixelferry-web

Public marketing site for **PixelFerry** — a fast, native-feeling batch image
converter for macOS.

This repo is **public** and holds only the website. The product (the Electron
desktop app + the Cloudflare Workers API) lives in the separate **private**
monorepo `pixelferry-app`. GitHub repositories are atomically public or private,
so the public site cannot share a repo with the private app.

**`pixelferry-app` is the source of truth for every product claim on this
site.** Facts are transcribed into `src/data/product.ts` and read from there;
`npm test` fails if the site states an obsolete macOS version, calls the app
"native", or claims a price, rating or download count. See
[`CLAUDE.md`](./CLAUDE.md) for the sync procedure.

## Stack

Static **Astro 7** (SSG) · TypeScript 6 strict · Tailwind 4
(`@tailwindcss/vite`) · `@astrojs/sitemap` · content collections with Zod
schemas · Cloudflare Workers Static Assets.

No client framework, no hydration, no SSR, no database. The homepage ships **~2
KB of gzipped JavaScript**; every other page ships under 300 bytes. Fonts are
self-hosted latin-subset woff2, so the site makes no third-party request at
runtime.

```bash
npm install
npm run dev        # dev server
npm run build      # static build to dist/
npm run verify     # the full pre-push chain
```

## Commands

|                                            |                                                                       |
| ------------------------------------------ | --------------------------------------------------------------------- |
| `npm run dev` / `build` / `preview`        | Astro                                                                 |
| `npm run check`                            | `astro check` (types + templates)                                     |
| `npm run lint` · `format` · `format:check` | ESLint, Prettier                                                      |
| `npm test`                                 | Vitest — product claims, waitlist contract, built output              |
| `npm run test:e2e`                         | Playwright against `wrangler dev` (Chromium desktop + mobile, WebKit) |
| `npm run audit:seo`                        | metadata, canonicals, structured data, sitemap, CSP shape             |
| `npm run audit:links`                      | every internal link and asset resolves                                |
| `npm run audit:content`                    | anti-scaled-content: uniqueness, substance, honesty                   |
| `npm run lighthouse`                       | performance budgets (`-- --desktop` for desktop)                      |
| `npm run icons`                            | regenerate the favicon set                                            |
| **`npm run verify`**                       | **everything above, in order**                                        |

`verify` builds _before_ it tests — the audits and E2E suite all read `dist/`.

## Pages

Twenty indexable pages, all rendered at build time:

```
/                          product, waitlist, FAQ
/formats                   complete read/write format reference
/convert · /convert/{slug} conversion index + 11 conversion pages
/guides  · /guides/{slug}  guide index + 3 guides
/privacy · /cookies        legal (DRAFT — see below)
/404                       real HTTP 404, noindex
```

Conversion pages and guides come from Markdown in `src/content/` with schemas
that _require_ the fields that make a page worth reading — what actually changes
in the file, real limitations, and the free built-in macOS alternative. A page
with nothing specific to say fails the build. See
[`docs/seo.md`](./docs/seo.md#the-anti-scaled-content-rule).

## Design source

The landing page implements the **`Landing — Coming Soon 2026`** frame (node
`FKjy8`) in the Pencil file at `~/Documents/image-converter`, which is the
authoritative design. Every colour, size, radius and shadow in
`src/styles/global.css` is a resolved value read out of that file.

Two token scales exist: the page's dark palette (`--color-void`, `--color-blue`,
…) and `--color-ap-*`, the product design system's **light** theme, which is
what the embedded app-window preview renders in.

Three values deviate from the design, each to fix a measured WCAG AA contrast
failure — the footer copyright, the app-preview row metadata, and the addition
of a focus ring on the waitlist field. Each is commented at the point of change.

If the design moves, re-read it through the Pencil MCP rather than eyeballing
the rendered page.

## Waitlist

The hero form POSTs JSON to `PUBLIC_WAITLIST_ENDPOINT` — the Worker in
`pixelferry-app/apps/api` — with a **required, unticked** consent checkbox.

The contract is pinned in `src/lib/waitlist-contract.ts` and tested in
`test/waitlist-contract.test.ts` and `test/e2e/waitlist.spec.ts`. Three
constants must match the server exactly, or every signup fails in production:
the Turnstile action (`waitlist_signup`), the consent wording (compared
byte-for-byte against the server's registry), and the consent version. See
[`CLAUDE.md`](./CLAUDE.md#waitlist-invariants--breaking-these-breaks-production).

With the endpoint unset, the form falls back to a `mailto:` link rather than
faking a successful signup.

Turnstile is fetched on **first interaction with the form**, so a page view
makes zero third-party requests. Its sitekey carries `no_clearance`, so it sets
no cookie.

## Tracking and cookie consent

`PUBLIC_GTM_ID` and `PUBLIC_META_PIXEL_ID` are **unset**, and with both unset
the site loads no tags, sets no cookies, shows no banner and ships **zero
bytes** of consent code — verified in-browser by `test/e2e/security.spec.ts`.

> ⚠ Setting either requires three changes in the same commit: revise the Privacy
> and Cookie policies (they currently state the site uses no analytics or
> marketing technologies), widen the CSP in `public/_headers` (which blocks both
> origins outright today, deliberately), and verify the cookie schedule in
> `src/data/legal.ts`.

Note that Google requires EEA advertisers to use a Google-certified CMP for Ads
features. The banner implemented here handles Consent Mode v2 correctly but is
not on that list.

## Legal pages

`/privacy` and `/cookies` render copy transcribed **verbatim** from the Pencil
design in `src/data/legal.ts`. Do not rewrite that text — it is drafted copy
pending legal review, and the bracketed placeholders are deliberate. Both pages
carry the design's **DRAFT FOR LEGAL REVIEW** badge.

Still to fill in: `[LEGAL COMPANY NAME]`, `[FULL REGISTERED ADDRESS]`,
`[COMPANY NUMBER]`, `[PRIVACY EMAIL ADDRESS]`, `[DOMAIN]`, the EU-representative
block, and the `[PROVIDER NAME AND COUNTRY]` rows. §8 names the Hungarian DPA
(NAIH) — confirm that matches the controller's establishment.

## Documentation

|                                                  |                                                                                         |
| ------------------------------------------------ | --------------------------------------------------------------------------------------- |
| [`CLAUDE.md`](./CLAUDE.md)                       | agent guide: product, waitlist, SEO, privacy and security invariants                    |
| [`docs/architecture.md`](./docs/architecture.md) | rendering model, what JavaScript ships, relationship to the API                         |
| [`docs/seo.md`](./docs/seo.md)                   | metadata system, structured-data policy, the anti-scaled-content rule, launch procedure |
| [`docs/deployment.md`](./docs/deployment.md)     | Cloudflare target, preview deploys, cutover **and rollback**                            |
| [`docs/audits/`](./docs/audits/)                 | the migration audit and its evidence                                                    |

## Before going live

- Fill in the legal identity above, or decide explicitly to launch with the
  DRAFT badge.
- Create `hello@`, `privacy@` and `beta@pixelferry.app`, or change the links.
- `www.pixelferry.app` currently answers 200 instead of redirecting — needs a
  Cloudflare Redirect Rule ([`docs/deployment.md`](./docs/deployment.md)).
- `public/og.jpg` is a 1200×630 render of the hero. Regenerate it after any hero
  change.
- As an EU online service provider you likely owe an imprint/Impressum — the
  fields are the ones Privacy Policy §1 already collects.

---

© 2026 heymarcell. All rights reserved. PixelFerry is a proprietary product;
this repository contains only its public marketing site.
