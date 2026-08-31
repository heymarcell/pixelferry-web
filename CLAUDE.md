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

Product facts live in **`src/data/product.ts`** and **`src/data/formats.ts`**,
and every page derives from them, so a fact can only be wrong in one place.

### Syncing product facts

**Do not trust the app README.** It calls itself authoritative and it has been
wrong: at the currently pinned commit it still says "SVG, HEIC, PSD, PDF, RAW
are input-only", while the source has written HEIC on macOS all along. That
single stale line propagated into this site's data model, its FAQ, its
structured data, `llms.txt`, and a **test that enforced the false invariant**.

Reconcile in this order, and stop at the first that answers:

1. **executable source** — `apps/desktop/src/main/*.ts`, `pipeline.ts`
2. **tests exercising it** — `pipeline.test.ts`, `e2e/*.spec.ts`
3. **typed shared config the UI and pipeline both use** — `shared/settings.ts`,
   `shared/constants.ts`
4. only then README and docs

If source and docs conflict, **source and tests win**, and the app-doc defect is
recorded separately — never let stale app prose push a false claim onto this
site.

The procedure:

1. `git -C ../pixelferry-app fetch --all && git rev-parse origin/main` — record
   the exact SHA.
2. Read the four source files above. For formats specifically:
   `CROSS_PLATFORM_EXTENSIONS`, `MACOS_ONLY_EXTENSIONS`, `VALID_FORMATS`,
   `OUTPUT_FORMAT_ORDER`, `QUALITY_FORMATS`, `DEFAULT_RECIPE`, and the encode
   dispatch in `main.ts` (which formats bypass `applyFormat`, and what is
   platform-gated).
3. Update `src/data/formats.ts` and `src/data/product.ts`, and bump BOTH
   `PRODUCT_FACTS_SYNCED` and `PRODUCT_FACTS_APP_COMMIT`.
4. Update the snapshot arrays in `test/format-model.test.ts` to match. Bumping
   the commit without re-copying them defeats the point.
5. `npm test`.

Public CI must never clone the private repo, so nothing here can detect drift
automatically. The tests prove the site agrees with the **pinned snapshot**, not
with app `main` — say that, rather than implying live parity.

CI must never clone the private repo. The guard is a test over this repo's own
content, not a cross-repo diff.

## Resolving app state — get this right first

| Ref               | SHA                                        |
| ----------------- | ------------------------------------------ |
| App `origin/main` | `f107ef72836c422f000e31a1100b129d23a53f8d` |

**Always `git -C ../pixelferry-app fetch --all && git rev-parse origin/main`.**
Never read app state from a local checkout, and never pin a PR head as though it
were released. Both mistakes were made on this branch: one pass pinned
pre-rebase SHAs off a local feature branch that existed on no remote, and a
later pass pinned an open PR's head that then moved before it merged.

If you must pin an unmerged candidate, set `PRODUCT_FACTS_APP_PENDING` and
re-verify against the merge result — `test/upstream-dependency.test.ts` enforces
the invariant in both directions.

## Product invariants — never state otherwise

- **Capability phrasing is symmetric.** `capabilityOf` must render read and
  write with their own scopes — `read anywhere; write on macOS`, never
  `read and write on macOS`. The old version joined bare verbs with "and", so
  the macOS scope leaked backwards onto the read verb and said the opposite of
  the truth about HEIC. Three tests asserted the broken string.
- **The app's output order is `OUTPUT_ORDER`, not `writableFormats`.** The
  latter follows this file's grouping, which puts AVIF before HEIC. Any public
  list mirroring the app's picker must use `outputFormats`. Test the exact
  SEQUENCE — set-equality passes while the order is wrong, which is how it
  shipped.
- **The format model publishes claims.** `summary` and `caveat` render on
  /formats and in llms.txt, so no superlatives: no "universal", "smallest",
  "best", "workhorse", "archival", "successor". TIFF is a container and is not
  lossless by definition; say what PixelFerry writes instead.

- **The pipeline is 8-bit end to end.** Every encoder branch in the app's
  `applyFormat` is called without a `bitdepth`, so PNG, TIFF, lossless WebP and
  lossless AVIF all come out `depth: uchar` — measured, from a 16-bit source. A
  "lossless" claim is therefore true of the CODEC and false of the CONVERSION.
  Never write "perfect copy", "adds no new quality loss" or "pixel-exact"
  without scoping it to 8 bits. `test/pipeline-claims.test.ts` and
  `audit:content` both guard this; `limits.bitDepth` records the measurement.
  This shipped as a page that asserted both halves at once — "adds no new
  quality loss" in the frontmatter, "a 10-bit HEIC is quantised" forty lines
  below — and passed every check, because each sentence is only wrong in the
  presence of the other.
- **A figure and a named source must actually belong together.** "26% smaller
  than PNG" was attributed to Google's _WebP Lossless and Alpha Study_ in four
  places; that study says 23% (vs ZopfliPNG) and 42% (vs libpng), and 26% is the
  overview page. Both halves were individually true. Before citing a study by
  name, open it and confirm it contains the number.
- **Do not describe an app default from memory.** `removeMetadata`,
  `dontUpscale` and `defaultSaveLocation` were all described backwards or
  omitted. Read `DEFAULT_RECIPE` and `DEFAULT_SETTINGS` in `shared/settings.ts`.
- **macOS built-ins move.** `sips` writes AVIF on current macOS (`public.avif`
  is Writable) and does not write WebP. Re-run `sips --formats` before claiming
  a built-in cannot do something; this site claimed both directions on two
  different pages simultaneously.

- **macOS 14 (Sonoma) or later**, on Apple silicon and Intel. The site said
  "macOS 13+" in four places for a month; that is why there is a test.
- **Never call it "native".** It is Electron + React + Sharp. It uses macOS
  system codecs and feels native — the app's own docs say _native-feeling_, and
  so does this site. "A native Mac app" is a false technical claim.
- **Output formats are JPG, PNG, WebP, HEIC, AVIF, TIFF, GIF, ICO.** **HEIC
  output is real** and macOS-only — the encode goes through `sips`. PSD, PDF,
  SVG and camera RAW are read but never written.
- **Read and write are separate per format, and they differ.** HEIC reads
  anywhere but writes only on macOS; ICO reads only on macOS but writes
  anywhere; ICNS is never written. Never collapse these into one "input-only"
  list — that is exactly the shape that produced the HEIC error.
- **`/formats` claims to be complete, so it must be.** The app accepts **76**
  extensions across 23 families; all of them are modelled in `formats.ts` and
  `test/format-model.test.ts` fails if any are missing or invented.
- **Metadata removal is ON by default** (`DEFAULT_RECIPE.removeMetadata: true`),
  and the option does not govern HEIC output, which `sips` transcodes outside
  the bundled encoder.
- **The default quality is 80** for every lossy codec. Anchor guidance on that
  rather than inventing per-format thresholds.
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

**Any new numerical compression, quality, compatibility, performance or
macOS-behaviour claim must be verified against a current primary source or an
actual PixelFerry benchmark before publication.** If neither exists, the number
does not go on the page. Record what you used in `docs/content-sources.md`.

**A green `audit:content` does not mean the content is true.** It measures
duplication, substance, and the recurrence of specific phrases already proven
false. It cannot judge a claim it has never seen — regex is not a truth engine.
Factual accuracy is a research gate against primary evidence, and two separate
reviews found wrong statements that every automated check passed.

This is not hypothetical: the first draft of this content shipped several
confident, plausible, wrong claims — that Preview resizes one image at a time
(Apple documents the opposite), that WebP is the only format with lossy
compression plus alpha (AVIF does it too), that lossless WebP is "strictly
better" than PNG (Google documents cases where it is larger), and several
unattributed percentages. `audit:content` now pins those specific phrases, but
it cannot judge a NEW claim. Only reading the source can.

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
- **Scope the app's privacy claim to the desktop app.** "Conversion runs
  entirely on your Mac" and "the desktop app does not upload your source files,
  clipboard contents or conversion metadata" are provable —
  `desktop-security.spec.ts` scans the source for the common outbound call
  patterns — `fetch(`, `net.fetch(`, `net.request(`, `new WebSocket(`,
  `new XMLHttpRequest(`, `new EventSource(` — and fails the build if one
  appears. Do not describe that as catching ANY outbound path: it would not see
  Node `http`/`https`, `child_process`, `sendBeacon`, an aliased call, or a
  dependency. As of `f6bd954` the shipping desktop app genuinely has no network
  client at all — no updater, no licence call, no telemetry, no crash reporter,
  and `electron-updater` and Sentry are in no lockfile.

  "There is no server in this product" is still NOT safe to write: the project
  runs `api.pixelferry.app`, which is fully built and deployed. What is true is
  that the DESKTOP CLIENTS for it do not exist yet. The app's own privacy policy
  describes update checks, licence validation, a beta safety check and bug
  reports in the present tense for clients that have not shipped — so it is a
  forward-looking document, not a description of today's binary.

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
| **`npm run verify`**                                       | **the full local pre-push chain** (no Lighthouse)        |
| `npm run verify:full`                                      | `verify` plus Lighthouse, mobile and desktop             |

`npm run verify` builds **before** it tests: the audits and the E2E suite all
read `dist/`.

`verify` deliberately stops short of Lighthouse — it takes minutes and wants a
quiet machine. CI runs it as its own step, and `verify:full` runs it locally. Do
not describe `verify` as proving performance; it does not.

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
  `chore/…`, `docs/…`), open a PR, let the `check` job go green, squash-merge.
  This is enforced: the `protect-main` ruleset requires a PR and the `check`
  status context, and forbids force-pushes and deletion. Repository admins can
  bypass it, so the owner is never locked out.
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

**The site is live on `pixelferry.app` and every infrastructure blocker is
closed.** The four that used to be listed here are all resolved: the controller
identity is published (`neongod LLC`), the mailboxes route through Cloudflare
Email Routing with MX, SPF and DMARC live, `www` 301s to the apex via a zone
Redirect Rule, and production was cut over through the existing Pages project,
which already owned both hostnames and so needed no DNS change.

Two items remain, and **neither is blocked on site code** — both are decisions
only the operator can make:

- **The waitlist retention period.** Nobody has chosen one. `legal.ts` says so
  rather than inventing a number, and choosing it also unlocks a small
  `apps/api` change to implement the `waitlist_signups` deletion sweep.
- **The Article 27 EU representative.** Not appointed; `/privacy` states that
  position explicitly rather than leaving the field blank.

The legal copy also remains **pending review by a qualified adviser** — that is
what the DRAFT badge means, and it is separate from the placeholders, which are
gone. See `docs/deployment.md` for the verified launch state and
`docs/audits/astro-seo-rebuild-2026-08-29.md` §9 for the original list.
