# Astro 7 + SEO rebuild — audit and evidence

**Date:** 2026-08-29 · **Branch:** `feat/astro7-seo-rebuild`

The record behind the migration: what the live site was doing, what was verified
against current first-party documentation, what changed, and what is still
blocked on information this repository does not have.

---

## 1. The headline finding: the hero was invisible in production

Before any code was written, `https://pixelferry.app/` was loaded in Chrome 151
on macOS. The page rendered the nav, the page glow, and nothing else.

```js
// evaluated on the live page, three separate loads
{ h1text: "Mixed formats.One clean batch.",
  h1opacity: "0",
  h1transform: "matrix(1, 0, 0, 1, 0, 18)",
  reducedMotion: false,
  h1anims: []  ← Motion never created an animation
}
```

The `<h1>`, the pitch, the waitlist form and the product preview were all stuck
at `opacity: 0` — the `initial="hidden"` state of a Motion variant whose
entrance animation never ran. No console error, no CSP violation,
`prefers- reduced-motion: false`, WAAPI available, and
`document.getAnimations()` returning only the CSS keyframe animations.
Reproduced on three consecutive loads with cache busting.

So the site's entire above-the-fold content — including its only conversion path
— was invisible to a visitor in a current Chrome.

Screenshots: `screenshots/before/01-desktop1440-AS-SERVED-broken.jpg` is what
was actually served. The other three were captured after forcing `opacity: 1` in
the page, and are what the design was supposed to look like.

This is the single strongest argument for the architecture change, and it is why
the new build's first rule is **content is rendered visible and the animation is
the enhancement**, never the reverse (`src/styles/global.css`, `.js-reveal`).

---

## 2. Baseline: the site as it was

### Production HTTP behaviour (curl, 2026-08-29)

| Check                                  | Result                                | Verdict                                               |
| -------------------------------------- | ------------------------------------- | ----------------------------------------------------- |
| `GET /definitely-not-a-real-page-9f3a` | **200**, 4063 bytes                   | **Soft 404** — every unknown URL served the SPA shell |
| `GET /privacy`                         | 200                                   | correct                                               |
| `GET /privacy/`                        | 308 → `/privacy`                      | correct                                               |
| `GET /privacy.html`                    | 308 → `/privacy`                      | correct                                               |
| `GET https://www.pixelferry.app/`      | **200**, no redirect                  | duplicate host serving the same content               |
| `GET http://pixelferry.app/`           | 301 → https                           | correct                                               |
| `robots.txt`                           | points at `/sitemap.xml`              | correct but the sitemap was wrong                     |
| `sitemap.xml`                          | **1 URL** (`/` only)                  | `/privacy` and `/cookies` were never listed           |
| CSP                                    | `script-src 'self' 'unsafe-inline' …` | `'unsafe-inline'` in both script-src and style-src    |

### Lighthouse

Two measurements are recorded, because they answer different questions.

**Against production over the internet** (Lighthouse 13.4.1, median of 1):

|                | Mobile  | Desktop |
| -------------- | ------- | ------- |
| Performance    | 90      | 99      |
| Accessibility  | 96      | 96      |
| Best practices | 100     | 100     |
| SEO            | 100     | 100     |
| LCP            | 3.6 s   | 0.8 s   |
| Total transfer | 379 KiB | 374 KiB |

**Against the old build served locally** — the apples-to-apples comparison used
in §5, since the new site is also measured locally (median of 3, mobile):

| Performance | A11y | Best practices | SEO | LCP    | FCP    | CLS   | Bytes   | Requests |
| ----------- | ---- | -------------- | --- | ------ | ------ | ----- | ------- | -------- |
| 83          | 96   | 100            | 100 | 3.60 s | 3.30 s | 0.006 | 475 KiB | 14       |

The one accessibility failure was `color-contrast` on the footer copyright:
`text-white/40` over `#090B12` is **3.70:1**, below the 4.5:1 AA floor.

### Bundle

|                                     | Raw                           | Gzip      |
| ----------------------------------- | ----------------------------- | --------- |
| Homepage JS (`bootstrap` + `index`) | 299,986 B                     | ~98,400 B |
| All JS in `dist/`                   | 315,654 B                     | 102,221 B |
| CSS                                 | 44,134 B                      | 8,787 B   |
| Fonts                               | 315,940 B across **15** files | —         |

The 15 font files were Fontsource's full subset set — Cyrillic, Greek and
Vietnamese faces shipped for an English-only site.

---

## 3. Research gate

Verified against first-party sources before any dependency changed. Third-party
SEO commentary was not used where a first-party source exists.

### Framework and platform

| Question                             | Finding                                                                                                                                                                                               | Source                                                  |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Current stable Astro                 | **7.2.9**; Rust compiler is the only compiler, Vite 8, `compressHTML: 'jsx'` default, native Markdown pipeline (`@astrojs/markdown-remark` needed for remark/rehype plugins), `src/fetch.ts` reserved | docs.astro.build upgrade-to/v7, npm registry            |
| Node floor                           | `>=22.12.0` (astro `engines`)                                                                                                                                                                         | npm registry                                            |
| `astro:env`                          | stable, `env.schema`                                                                                                                                                                                  | Astro configuration reference                           |
| Fonts API / `security.csp`           | both **stable** since Astro 6                                                                                                                                                                         | Astro configuration reference, astro.build/blog/astro-6 |
| Adapter needed for a static site?    | **No** — "If you want to use Astro as a static site generator, you do not need the Astro Cloudflare adapter"                                                                                          | Cloudflare Workers framework guide, Astro               |
| Real 404 on Workers                  | `assets.not_found_handling: "404-page"` serves the nearest `404.html` with a 404 status                                                                                                               | Cloudflare Workers static-assets SSG guide              |
| URL shape                            | `html_handling: "auto-trailing-slash"` serves `foo.html` at `/foo`                                                                                                                                    | Cloudflare static-assets routing                        |
| `_headers` / `_redirects` on Workers | supported; 100 rules, 2,000 chars per line; **cannot match on hostname** ("Domain-level redirects ❌")                                                                                                | Cloudflare static-assets headers/redirects              |
| Preview hostname control             | `workers_dev: false`; `preview_urls` defaults to the `workers_dev` value from Wrangler 4.44                                                                                                           | Cloudflare Workers configuration, changelog 2025-10-23  |
| TypeScript                           | **6.0.3**, not 7 — `@astrojs/check` peers `^5 \|\| ^6`, `typescript-eslint` peers `>=4.8.4 <6.1.0`                                                                                                    | npm registry                                            |

### Search

| Question                          | Finding                                                                                                                                                    | Consequence here                                                                                                                                                                                                        |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SoftwareApplication` rich result | Requires `name`, `offers.price`, **and** `aggregateRating` or `review`                                                                                     | PixelFerry has no price and no ratings, so it is **not eligible**. The old site's `price: "0"` / `PreOrder` offer described a free product that does not exist. Removed; the node stays as descriptive structured data. |
| Scaled content abuse              | "using generative AI tools … to generate many pages without adding value for users may violate Google's spam policy on scaled content abuse"               | `npm run audit:content` measures per-page uniqueness rather than trusting intent (§4)                                                                                                                                   |
| Favicon                           | Google wants a square raster icon ≥48×48; SVG is not accepted                                                                                              | The old site shipped `favicon.svg` only → no favicon eligibility. Added `.ico`, 96px PNG, 180px apple-touch-icon.                                                                                                       |
| `llms.txt`                        | Google's Search team has stated it does **not** use it and has no plans to; adoption ~8–10% of top sites; no major AI provider has committed to reading it | See §6 — added as a small, honest interoperability file, explicitly **not** claimed as a ranking factor                                                                                                                 |

### SERP research

Live SERP for _batch image converter Mac_, _HEIC to JPG Mac_, _convert HEIC
without uploading_. Competitors seen: XnConvert, PhotoConvert, iMazing
Converter, Picmal, BatchPhoto, Compresto, plus a long tail of thin "5 methods"
listicles.

Two things stood out and shaped the content:

1. **Intent is how-to, not product.** The pages that rank explain Preview's
   Export Selected Images, the Finder Convert Image Quick Action, and `sips`. A
   page that pretends the built-in route does not exist is transparently selling
   and reads as such. So every conversion page has a required `macOSAlternative`
   field naming the free option first, and the guide
   `/guides/batch-convert-images-on-mac` is _entirely_ about the built-ins.
2. **The gap is technical honesty.** Almost nothing explains what actually
   changes in the file — bit depth, chroma subsampling, alpha, ICC, generational
   loss. That is where the information gain is, and it is what the `whatChanges`
   and `limitations` schema fields force onto every page.

Nothing was copied from any competitor.

---

## 4. Product-truth audit

The website had drifted from the app. Verified against
`heymarcell/pixelferry-app` (`CLAUDE.md`, `README.md` §1/§2/§7,
`apps/desktop/src/main/pipeline.ts`).

| Claim on the old site                                                   | Reality                                                           | Fix                        |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------- | -------------------------- |
| "macOS 13+" (hero)                                                      | **macOS 14 (Sonoma)**                                             | corrected                  |
| `"operatingSystem": "macOS 13.0 or later"` (JSON-LD)                    | same                                                              | corrected                  |
| "a **native** batch image converter" (title, description, OG, noscript) | Electron + React + Sharp; the app's own docs say _native-feeling_ | reworded throughout        |
| `offers: { price: "0", availability: "PreOrder" }`                      | no price, no product to order                                     | removed                    |
| `.env.example`: Turnstile action `waitlist`                             | the Worker pins **`waitlist_signup`**                             | corrected                  |
| `sitemap.xml` listing only `/`                                          | `/privacy` and `/cookies` also public                             | generated sitemap, 20 URLs |

All product facts now live in `src/data/product.ts` and are read from there by
every page. `test/product-claims.test.ts` fails the build if an obsolete macOS
version, a technical "native" claim, or a price/rating/download-count appears
anywhere in `src/` or `public/`.

Also newly documented from the pipeline source, because they are useful and were
nowhere on the site: the metadata option strips EXIF/XMP/IPTC but deliberately
**keeps the ICC profile**, and there is a target-file-size search.

---

## 5. Results

### Lighthouse — both builds served locally, mobile, median of 3

|                | Old (React/Vite) | New (Astro 7) | Change |
| -------------- | ---------------- | ------------- | ------ |
| Performance    | 83               | **99**        | +16    |
| Accessibility  | 96               | **100**       | +4     |
| Best practices | 100              | 100           | —      |
| SEO            | 100              | 100           | —      |
| LCP            | 3.60 s           | **1.73 s**    | −52%   |
| FCP            | 3.30 s           | **1.36 s**    | −59%   |
| CLS            | 0.006            | **0.000**     | −100%  |
| TBT            | 0 ms             | 0 ms          | —      |
| Total transfer | 475 KiB          | **133 KiB**   | −72%   |
| Requests       | 14               | 16            | +2     |

Desktop, new build: **100 / 100 / 100 / 100**, LCP 0.43 s, CLS 0.000. Content
pages: **100 / 100 / 100 / 100** on mobile, LCP 1.65 s.

> These are **lab** numbers under Lighthouse's simulated throttling, not field
> Core Web Vitals. Field CWV is the 75th percentile of real visitors and can
> only come from CrUX or a RUM script once the site has traffic.

### Bundle

|                          | Old                  | New                    | Change                     |
| ------------------------ | -------------------- | ---------------------- | -------------------------- |
| Homepage JS (gzip)       | ~98,400 B            | **2,123 B**            | **−97.8%**                 |
| Homepage JS (raw)        | 299,986 B            | **4,038 B**            | −98.7%                     |
| Content page JS (gzip)   | ~14,900 B            | **294 B**              | −98.0%                     |
| All JS in `dist/` (gzip) | 102,221 B            | 2,835 B                | −97.2%                     |
| CSS (gzip)               | 8,787 B              | 10,282 B               | +1,495 B for 17 more pages |
| Fonts                    | 315,940 B / 15 files | **88,824 B / 3 files** | −72%                       |
| `dist/` total            | 932 KB               | 792 KB                 | −15% (with 7× the pages)   |

React, react-dom, Motion and lucide-react are gone. The remaining homepage
JavaScript is the waitlist form (1,762 B gzip) and the reveal observer (354 B).

### Surface

|                             | Old                          | New         |
| --------------------------- | ---------------------------- | ----------- |
| Indexable pages             | 3                            | **20**      |
| Sitemap URLs                | 1                            | 20          |
| Unknown URL status          | **200** (soft 404)           | **404**     |
| Inline `<script>`           | 1 per page                   | 0           |
| Inline `<style>` / `style=` | present                      | 0           |
| CSP `'unsafe-inline'`       | script-src **and** style-src | **neither** |

---

## 6. Decisions worth defending

**No `Organization` JSON-LD, no `offers`, no `aggregateRating`.** The legal
controller is an unfilled placeholder and there is no price or rating. Inventing
any of them to satisfy a validator would be fabricating facts. The
`SoftwareApplication` node describes the product accurately and forgoes a rich
result it is not eligible for. `audit-seo.mjs` fails the build if any of those
properties reappear.

**No `FAQPage` structured data.** Google restricted that rich result to
well-known authoritative government and health sites. The FAQ is on the page
because it is useful; marking it up would be schema aimed at a result this site
cannot get.

**`llms.txt` is included but is not claimed to do anything for ranking.**
Google's Search team has said it does not use the file. Against that: Lighthouse
13 now ships an `agentic-browsing` category that audits for it (the old site
scored 67 there). It costs under a kilobyte and no runtime, and it is a genuine
convenience for a client that wants a map of the site. It is documented as
interoperability, not SEO.

**Shiki syntax highlighting is off.** It writes a `style` attribute on every
token, which would force `style-src 'unsafe-inline'` back into the CSP, and it
added ~1.9 KB of span soup to a page with three shell snippets.

**Fonts are hand-declared, not Astro's Fonts API.** The Fonts API emits its
`@font-face` block as an inline `<style>`, which has the same CSP consequence.
Hand-written faces in the external stylesheet, with `size-adjust` fallback
metrics, give the same result with none of it.

**WebKit is tested against a static server, not `wrangler dev`.** Playwright's
WebKit times out on every request to workerd on this platform while reaching a
plain Node server fine. The cause is `upgrade-insecure-requests` + HSTS on a
plain-HTTP loopback origin: WebKit rewrites subresources to `https://127.0.0.1`,
which has no TLS listener (Chromium exempts loopback as a
potentially-trustworthy origin; WebKit does not). `scripts/serve-dist.mjs` drops
exactly those two transport directives and passes the rest of the real CSP
through. Cloudflare-specific behaviour is asserted against real workerd in the
Chromium projects.

**The `form` waitlist transport was removed.** `PUBLIC_WAITLIST_FORMAT=form`
posted an opaque `no-cors` request straight to a provider endpoint, with no
Turnstile and no consent record — which would have silently broken the
proof-of-consent promise in Privacy Policy §2 the moment anyone enabled it. It
was never used; production posts JSON to our own Worker. The JSON contract is
untouched.

---

## 7. Accessibility findings and fixes

Every one of these was found by `@axe-core/playwright` or by a manual keyboard
pass, and each is a real defect rather than a tuning of the test.

| Finding                                                                      | Fix                                                                     |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Footer copyright `text-white/40` on `#090B12` = 3.70:1                       | raised to `/56` (6.4:1)                                                 |
| App-preview row metadata `--color-ap-dim` at 60% on the error row = 4.43:1   | raised to 66% (5.3:1)                                                   |
| The email input carries `outline-none` and had **no focus indicator at all** | focus ring drawn on the containing pill via `:has(input:focus-visible)` |
| Page title block sat **outside** `<main>` on every content and legal page    | moved inside; axe `region` clean                                        |
| `overflow-x-auto` table wrappers not keyboard-reachable                      | `tabindex="0"` + `role="region"` + a name                               |
| Markdown tables were their own unfocusable scroll container                  | they wrap instead; no scroll container, no unreachable region           |
| The new nav overflowed the viewport at **every** width ≤ 430 px              | header wraps to a second row below `sm`                                 |

Result: **zero axe violations** of any impact on all nine tested URLs, in
Chromium and WebKit, at
`wcag2a wcag2aa wcag21a wcag21aa wcag22aa best-practice`.

Two keyboard tests are skipped in WebKit: Safari ships "Press Tab to highlight
each item on a webpage" off, so its Tab key skips links and checkboxes. That is
a browser preference, not a page defect — the controls are focusable, which the
focus-indicator test proves in WebKit by calling `focus()` directly.

---

## 8. Verification

```
npm run verify
```

| Gate               | Result                                                                                        |
| ------------------ | --------------------------------------------------------------------------------------------- |
| `prettier --check` | clean                                                                                         |
| `eslint`           | clean                                                                                         |
| `astro check`      | 0 errors, 0 warnings, 0 hints (61 files)                                                      |
| `vitest`           | 32 passed                                                                                     |
| `audit:seo`        | 1,190 checks over 21 pages                                                                    |
| `audit:links`      | 1,930 checks, 401 internal links, 0 broken                                                    |
| `audit:content`    | 261 checks; 14 templated pages, 879 words average, worst-pair similarity **4.4%** (limit 28%) |
| `playwright`       | 221 passed, 25 skipped, across Chromium desktop, Chromium mobile and WebKit                   |
| `lighthouse`       | budgets met on 4 pages × mobile and desktop                                                   |

---

## 9. Unresolved external blockers

None of these can be closed from inside this repository, and none of them are
invented here.

### Legal identity — blocks publication, not the migration

The Privacy Policy and Cookie Policy carry deliberate placeholders. Both repos
and their history were searched; no controller entity is recorded anywhere.

- `[LEGAL COMPANY NAME]`
- `[FULL REGISTERED ADDRESS]`
- `[COMPANY NUMBER]`
- `[PRIVACY EMAIL ADDRESS]`
- `[DOMAIN]`
- `[EU REPRESENTATIVE NAME]` / `[EU REPRESENTATIVE ADDRESS]` /
  `[EU REPRESENTATIVE EMAIL]`
- `[PROVIDER NAME AND COUNTRY]` rows in the processor table

Both pages carry a visible **DRAFT FOR LEGAL REVIEW** badge, so nothing presents
itself as complete. Privacy Policy §8 names the Hungarian DPA (NAIH) — that must
be confirmed against the controller's actual establishment.

An EU online service provider also likely owes an imprint/Impressum; the fields
it needs are the same ones §1 already asks for.

### Mailboxes

`hello@pixelferry.app`, `privacy@pixelferry.app` and `beta@pixelferry.app` are
linked from the site. They must exist before launch or be changed.

### Cloudflare — preview verified, cutover outstanding

A non-production Worker was deployed and checked on real Cloudflare
infrastructure:

`https://pixelferry-web-preview.neongod-llc.workers.dev`

| Check                                      | Result                                    |
| ------------------------------------------ | ----------------------------------------- |
| Unknown URL                                | **404** (the defect this migration fixes) |
| `noindex, nofollow` on all 8 checked pages | present                                   |
| `/privacy/` and `/privacy.html`            | 307 → `/privacy`                          |
| CSP                                        | served, no `'unsafe-inline'`              |
| `/_astro/*`                                | `max-age=31536000, immutable`             |
| HTML                                       | `max-age=0, must-revalidate`              |
| sitemap, robots, llms.txt, favicon.ico     | 200                                       |

It is deployed from `wrangler.preview.jsonc` — a separate Worker name, with
`workers_dev` enabled there and only there, and no routes. Production's config
keeps `workers_dev: false` and declares no custom domain, so a `wrangler deploy`
cannot move the live site.

The cutover itself still needs explicit authorisation — see
`docs/deployment.md`.

### A legal-entity LEAD, deliberately not used

The Cloudflare account is named **"neongod LLC"**. That is a lead, not a fact,
and it has NOT been written into the Privacy Policy. An account name is not
evidence of the data controller for this service — the controller could be a
different entity, a sole trader, or a natural person, and the registered
address, company number and EU-representative position are still unknown
regardless. Confirm it out of band and fill in §1 deliberately.

### `www.pixelferry.app`

Currently answers **200** with the same content rather than redirecting. The
canonical tag mitigates it, but a 301 is correct and it cannot be done from
`_headers` (no hostname matching). It needs a Cloudflare Redirect Rule; the step
is in `docs/deployment.md`.
