# pixelferry-web — agent guide

The **public** marketing site for PixelFerry. Static **Astro 7** (SSG) on
Cloudflare Workers Static Assets. No server, no database, no SSR, no framework
runtime — the homepage ships ~2 KB of gzipped JavaScript and every other page
ships under 300 bytes. Keep it that way.

## The two repositories

|                                                    |                                                                 |
| -------------------------------------------------- | --------------------------------------------------------------- |
| `heymarcell/pixelferry-web` (this one, **public**) | the marketing site only                                         |
| `heymarcell/pixelferry-app` (**private**)          | the product: an Electron desktop app + a Cloudflare Workers API |

**`pixelferry-app` is the source of truth for every product claim.** This repo
is public and the app repo is not, so the split is not optional. When the two
disagree, the website is wrong — fix the website, not the app.

Product facts are transcribed into **`src/data/product.ts`** and read from there
by every page, so a fact can only be wrong in one place. Re-syncing is a manual,
deliberate step:

1. Read `pixelferry-app/CLAUDE.md` and `README.md` §1 (requirements), §2
   (supported formats) and §7 (the pipeline).
2. Update `src/data/product.ts` and bump `PRODUCT_FACTS_SYNCED`.
3. `npm test` — `test/product-claims.test.ts` guards the facts that have already
   drifted once.

CI must never clone the private repo. The guard is a test over this repo's own
content, not a cross-repo diff.

## Product invariants — never state otherwise

- **macOS 14 (Sonoma) or later**, on Apple silicon and Intel. The site said
  "macOS 13+" in four places for a month; that is why there is a test.
- **Never call it "native".** It is Electron + React + Sharp. It uses macOS
  system codecs and feels native — the app's own docs say _native-feeling_, and
  so does this site. "A native Mac app" is a false technical claim.
- **Output formats are PNG, JPG, WebP, AVIF, TIFF, GIF, ICO.** HEIC, PSD, PDF,
  SVG and camera RAW are **input-only**.
- **PDF conversion stops at 100 pages** and says so. PSD/PSB are flattened to
  their stored composite. JPEG output flattens transparency onto **white**.
- **RAW, EXR, BMP, TGA, ICO, JXL, JP2 are macOS-only** — they decode through
  ImageIO, and there is no cross-platform fallback.
- **Conversion is local.** Nothing is uploaded, ever. Originals are never
  modified and output never overwrites an existing file.
- **There is no public download and no price.** It is a private beta with a
  waitlist. Do not imply otherwise anywhere, including in structured data.

## Waitlist invariants — breaking these breaks production

The form posts to `POST /v1/waitlist` on `api.pixelferry.app`, which is the
Worker in `pixelferry-app/apps/api`. Every constant lives in
**`src/lib/waitlist-contract.ts`** and is pinned by
`test/waitlist-contract.test.ts`.

- **Turnstile action is `waitlist_signup`.** It must equal
  `TURNSTILE_EXPECTED_ACTION_WAITLIST` in the API's `wrangler.jsonc`.
  `verifyTurnstile` rejects a mismatch — a drift 403s **every** signup.
- **The consent wording is byte-exact.** The server compares what it was sent
  against its own `CONSENT_REGISTRY` copy and rejects a one-character difference
  with 400. The registry is **append-only**: new wording is a NEW version bumped
  on both sides in the same change. Never edit an existing entry — rows already
  reference it.
- Current: version `2026-07-26.1`, privacy policy version `2026-07-25`.
- The consent checkbox is **`required` and never pre-ticked**. GDPR consent must
  be a positive act.
- The label renders the same `CONSENT_TEXT` constant the request body sends, so
  the stored record is provably what the visitor saw.
- Failure states are distinct: 403 → verification failed (and the spent
  Turnstile token is reset), 429 → rate limited, anything else → generic error.
  **Never report a failure as a success.**
- With no endpoint configured the form falls back to a `mailto:` link rather
  than faking a signup.
- `?confirmed=1` is where Brevo returns the visitor after double opt-in. It
  canonicalises to `/`.

## SEO invariants

- Every indexable page: **one** `<h1>`, a unique `<title>`, a unique meta
  description, and a self-referencing absolute canonical on
  `https://pixelferry.app`.
- **Trailing slash policy is `never`** (production already redirects `/x/` and
  `/x.html` to `/x`). Astro: `trailingSlash: 'never'`, `build.format: 'file'`;
  Cloudflare: `html_handling: "auto-trailing-slash"`.
- **Unknown URLs return a real 404.** `not_found_handling: "404-page"`. The old
  deployment answered 200 with the SPA shell for everything — a soft 404 across
  the entire URL space.
- **No fake structured data.** No `aggregateRating`, no `review`, no `offers`,
  no `Organization` until a real legal entity is known. PixelFerry is not
  eligible for the `SoftwareApplication` rich result and does not pretend to be.
  No `FAQPage` either — that result is restricted to authoritative government
  and health sites.
- **No thin programmatic SEO.** See below.
- **Never ship a production `noindex`.** Preview builds set `PF_NOINDEX=1`;
  `test/seo-output.test.ts` asserts both directions.
- The sitemap is generated and carries **no faked `lastmod`**.

## The anti-scaled-content rule

Google treats mass-produced pages with little added value as **scaled content
abuse**, whether or not a machine wrote them. `/convert/*` is exactly the
architecture that goes wrong.

**Prefer 10 exceptional pages to 500 generic ones.** Concretely:

- Never generate format-pair pages combinatorially. Every page is written.
- The content schema (`src/content.config.ts`) _requires_ the fields that make a
  page worth reading: at least three `whatChanges` entries, at least one real
  `limitations` entry, two `useCases`, and a `macOSAlternative` naming the free
  built-in route first. A page with nothing to say fails the build.
- `npm run audit:content` measures pairwise 8-word-shingle similarity across
  every templated page and fails above **28%**. Current worst pair: 4.4%.
- Never invent a benchmark, a download count, a rating, an award, a testimonial
  or a search volume. `audit:content` greps for several of these, and
  `test/product-claims.test.ts` fails on the rest.
- If a new conversion page has nothing true and specific to say, **do not write
  it**.

## Privacy invariants

- With `PUBLIC_GTM_ID` and `PUBLIC_META_PIXEL_ID` unset — the current state —
  the site loads no tag, sets no cookie, shows no banner and ships **zero
  bytes** of consent code. Verified by `test/e2e/security.spec.ts`.
- Setting either requires **three** changes in the same commit: revise the
  Privacy and Cookie policies (they currently state there is no analytics),
  widen the CSP in `public/_headers` (which blocks both origins outright today,
  deliberately), and verify the cookie schedule in `src/data/legal.ts`.
- Turnstile loads **on first interaction with the form**, not on page load, so a
  page view makes zero third-party requests. The sitekey carries `no_clearance`,
  so no cookie is set.
- Fonts are self-hosted. No runtime request to any third party, ever.
- The legal copy in `src/data/legal.ts` is transcribed verbatim from the Pencil
  design and is **pending legal review**. Do not rewrite it, and do not fill in
  the bracketed placeholders by inference — see "Open blockers" below.

## Security invariants

The CSP carries **no `'unsafe-inline'`**, for scripts or styles. Four things
keep that true, and all four are enforced by `npm run audit:seo`:

- `vite.build.assetsInlineLimit: 0` — Astro inlines a bundled `<script>` chunk
  below that limit.
- `build.inlineStylesheets: 'never'`.
- `markdown.syntaxHighlight: false` — Shiki writes a `style` attribute per
  token.
- No `style` attribute in any component; per-element values are CSS classes.

`test/e2e/security.spec.ts` listens for real `securitypolicyviolation` events in
Chromium and WebKit, so the policy is verified in a browser rather than assumed.
**Do not add `'unsafe-inline'` back to make a change easier.**

## Stack

Astro 7 (static) · TypeScript 6 strict · Tailwind 4 via `@tailwindcss/vite` ·
`@astrojs/sitemap` · content collections with Zod schemas · Vitest · Playwright
(Chromium desktop, Chromium mobile, WebKit) · `@axe-core/playwright` ·
Lighthouse · Cloudflare Workers Static Assets · Node 24 (`.nvmrc`).

TypeScript is pinned to **6.x**, not 7: `@astrojs/check` peers `^5 || ^6` and
`typescript-eslint` peers `<6.1.0`.

`tsconfig.json` **must** include `.astro/types.d.ts` and must not exclude
`.astro` — exclude beats include, and the whole `astro:env` / `astro:content`
typed surface silently becomes `never`.

## Commands

|                                                            |                                                          |
| ---------------------------------------------------------- | -------------------------------------------------------- |
| `npm run dev`                                              | dev server                                               |
| `npm run build`                                            | static build to `dist/`                                  |
| `npm run preview`                                          | Astro's preview server                                   |
| `npm run serve:dist`                                       | plain static server for `dist/` (WebKit E2E)             |
| `npm run check`                                            | `astro check` — 0 errors, 0 warnings, 0 hints            |
| `npm run lint` / `npm run format` / `npm run format:check` |                                                          |
| `npm test`                                                 | Vitest — product claims, waitlist contract, built output |
| `npm run test:e2e`                                         | Playwright, against `wrangler dev`                       |
| `npm run audit:seo`                                        | metadata, canonicals, schema, sitemap, CSP shape         |
| `npm run audit:links`                                      | every internal link and asset resolves                   |
| `npm run audit:content`                                    | anti-scaled-content: uniqueness, substance, honesty      |
| `npm run lighthouse`                                       | budgets; `-- --desktop` for the desktop preset           |
| `npm run icons`                                            | regenerate the favicon set from `public/favicon.svg`     |
| **`npm run verify`**                                       | **the full local pre-push chain**                        |

`npm run verify` builds **before** it tests: the audits and the E2E suite all
read `dist/`.

## Deployment

Static output to Cloudflare **Workers Static Assets** — no adapter, no Worker
script, no `main` in `wrangler.jsonc`. `workers_dev` and `preview_urls` are both
**false** on the production Worker, so it is reachable only at its custom domain
and no `*.workers.dev` copy exists to be indexed.

The custom domain is deliberately **not** declared in `wrangler.jsonc`: adding
it would move the live domain on the next `wrangler deploy`. The cutover and its
rollback are in `docs/deployment.md`, and it needs explicit authorisation.

## Working agreements

- **Never commit to `main`.** Branch (`feat/…`, `fix/…`, `refactor/…`,
  `chore/…`, `docs/…`), open a PR, let `ci / check` go green, squash-merge.
- Conventional Commits.
- **Inspect before editing.** Read the component, the test and the audit that
  cover an area before changing it.
- Run `npm run verify` before claiming done, and state failures plainly.
- **Look at the page.** A framework migration that passes tests and looks wrong
  is a failed migration. The design source is the Pencil frame
  `Landing — Coming Soon 2026` (node `FKjy8`) in `~/Documents/image-converter`;
  read it through the Pencil MCP rather than eyeballing values.
- **Content is visible first, animation is the enhancement.** Never ship markup
  that starts at `opacity: 0` and needs JavaScript to appear. The React build
  did, and shipped an invisible hero to production for a month.
- **No mass content generation.** See the anti-scaled-content rule.
- **No legal guessing.** Never invent a company name, address, registration
  number or representative.
- **No production mutation without explicit authorisation** — no domain switch,
  no DNS change, no analytics enablement, no merge.

## Open blockers

Tracked in `docs/audits/astro-seo-rebuild-2026-08-29.md` §9. In short: the legal
controller identity is unknown and every related field is a placeholder; the
three linked mailboxes may not exist yet; `www.pixelferry.app` still answers 200
instead of redirecting; and the production cutover needs Cloudflare account
access.
