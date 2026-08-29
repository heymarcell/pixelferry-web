# SEO

## The metadata system

No page writes `<head>` tags by hand. `src/components/seo/Seo.astro` takes a
title, a description and a **site-relative path**, and derives everything else —
canonical, `og:url`, robots, the full Open Graph and Twitter set.

Deriving the canonical from the path rather than accepting it as a prop is what
makes "self-referencing absolute canonical on every indexable page" a property
the build can check instead of a habit that decays. `npm run audit:seo` asserts
it against the emitted HTML.

Absolute URLs all route through `absoluteUrl()` in `src/data/site.ts`, so the
origin is written once.

## URL and canonicalisation policy

- **Origin:** `https://pixelferry.app`.
- **Trailing slash: never.** Astro `trailingSlash: 'never'` +
  `build.format: 'file'`; Cloudflare `html_handling: "auto-trailing-slash"`.
  `/privacy/` and `/privacy.html` both 307 to `/privacy`, exactly as the old
  deployment did.
- **One canonical per page**, absolute, self-referencing.
- **Query strings never create a second page.** `/?confirmed=1` — where Brevo
  returns a visitor after double opt-in — canonicalises to `/`, and query URLs
  never appear in the sitemap.
- `www.pixelferry.app` currently answers 200 rather than redirecting. That
  cannot be fixed from `_headers` (no hostname matching) and needs a Cloudflare
  Redirect Rule — see [deployment.md](./deployment.md).

## Sitemap and robots

`@astrojs/sitemap` generates `sitemap-index.xml` + `sitemap-0.xml` at build
time. `robots.txt` points at the index.

`lastmod` is **deliberately stripped**. A build timestamp on every URL tells
Search that the whole site changed on every deploy, which is untrue and erodes
the signal. Per-page dates live in the content frontmatter and are rendered on
the page and in `Article` structured data, where they are real.

`audit-seo.mjs` cross-checks the sitemap against the set of indexable pages in
both directions: a page missing from the sitemap fails, and a sitemap entry that
is not an indexable page fails.

## Structured data

`src/lib/schema.ts` builds every JSON-LD block. What it emits:

| Page                    | Types                            |
| ----------------------- | -------------------------------- |
| Home                    | `WebSite`, `SoftwareApplication` |
| Content and legal pages | `BreadcrumbList`                 |
| Guides                  | `Article`                        |

### What it deliberately does not emit, and why

**No `offers`, no `aggregateRating`, no `review`.** Google's
`SoftwareApplication` rich result requires `name`, `offers.price`, **and** one
of `aggregateRating` / `review`. PixelFerry is an unreleased private beta with
no price and no ratings, so it is **not eligible** — and the honest response to
that is to be ineligible.

The previous site declared `offers: { price: "0", availability: "PreOrder" }`,
which described a free product available to pre-order. No such product exists.
That is a misrepresentation, and it was removed.

**No `Organization`.** The legal controller is still an unfilled placeholder in
the Privacy Policy. Inventing a publisher entity to satisfy a validator would be
fabricating a legal fact.

**No `FAQPage`.** Google restricted that rich result to well-known authoritative
government and health sites. The FAQ exists on the homepage because it answers
real questions; marking it up would be schema aimed at a result this site cannot
get.

**No `author` on `Article`.** Attributing the guides to a person would mean
inventing credentials.

`audit-seo.mjs` fails the build if any of `offers`, `aggregateRating`, `review`,
`ratingValue` or `reviewCount` appears in any JSON-LD block, and parses every
block to prove it is valid JSON with a `schema.org` context.

## Content architecture

```
/                       product, waitlist, FAQ
/formats                the complete read/write reference
/convert                conversion index
/convert/{slug}         11 conversion pages
/guides                 guide index
/guides/{slug}          3 guides
/privacy  /cookies      legal
/404                    noindex
```

Internal linking is deliberate rather than a footer keyword dump: the homepage
links to the formats reference, every conversion and every guide; conversion
pages link to two to five related conversions plus the formats hub; guides link
to the conversions they discuss; the formats table links each format to the
conversions available from it. `npm run audit:links` resolves all 401 internal
links against the emitted files, including fragment targets.

## The anti-scaled-content rule

Google treats mass-produced pages with little added value as **scaled content
abuse**, regardless of how they were written. A `/convert/{from}-to-{to}`
architecture is exactly the shape that goes wrong: eleven pages is useful, five
hundred generated permutations is a doorway farm.

Three mechanisms keep it on the right side, and none of them is a promise:

**1. The schema refuses a thin page.** `src/content.config.ts` requires at least
three `whatChanges` entries (what actually happens to the file), at least one
real `limitation`, two `useCases`, and a `macOSAlternative` that names the free
built-in route and says where it stops being enough. A page with nothing
specific to say cannot be authored.

**2. `npm run audit:content` measures uniqueness.** It computes pairwise Jaccard
similarity over 8-word shingles of every templated page's `<main>` and fails
above **28%**. Some overlap is structural — the pages share headings and a CTA —
but a page rewritten with the format names swapped scores far higher. It also
enforces a 550-word substance floor, distinct openings, the presence of a
limitations section and a macOS-alternative section, and greps for invented
adoption numbers, invented ratings, unverified awards and empty superlatives.

Current: 14 templated pages, 879 words average, **worst-pair similarity 4.4%**.

**3. Editorial rule, in `CLAUDE.md`.** If a new conversion page has nothing true
and specific to say, it does not get written.

## Generative AI search

No gimmicks. The things that actually help a model answer a question about this
product are the same things that help a person:

- Clear entity resolution — one `WebSite` and one `SoftwareApplication` node
  with real properties.
- Direct factual statements with the numbers in them ("the first 100 pages",
  "macOS 14 (Sonoma) or later", "flattens transparency onto white").
- Explicit limitations, which are rare in this category and are high information
  gain.
- Crawlable text: every word is in the HTML, none of it behind an interaction.
- Semantic structure: one `<h1>`, real `<table>` markup for the format matrix,
  `<dl>` for definitions.

### `llms.txt`

`public/llms.txt` exists and is accurate. It is documented — in the file itself
and here — as **interoperability, not ranking**:

- Google's Search team has stated Search does not use it and has no plans to.
- No major model provider has committed to reading it in production.
- Adoption is roughly 8–10% of top sites.
- Lighthouse 13 does ship an `agentic-browsing` category that audits for it (the
  old site scored 67 there).

It costs under a kilobyte and no runtime. That is the whole justification. Do
not claim it improves Google or AI ranking.

## Content Security Policy

Not strictly SEO, but it constrains how pages may be written, so it belongs next
to the rules that shape the markup.

The CSP in `public/_headers` carries **no `'unsafe-inline'`** — not for scripts,
not for styles. Four things keep that true:

1. `vite.build.assetsInlineLimit: 0` — Astro inlines a bundled `<script>` chunk
   below that limit, which would be an inline script.
2. `build.inlineStylesheets: 'never'`.
3. `markdown.syntaxHighlight: false` — Shiki writes a `style` attribute on every
   syntax token.
4. No component uses a `style` attribute; per-element values are CSS classes.

`audit-seo.mjs` fails on any inline `<script>` (JSON-LD excepted — it is a data
block, not executable), any `<style>` element, and any `style` attribute.
`test/e2e/security.spec.ts` then listens for real `securitypolicyviolation`
events in Chromium and WebKit, so the policy is verified in a browser rather
than assumed from the header text.

## Preview indexing safety

Two independent mechanisms, because getting this wrong in either direction is
expensive:

1. **Structural.** `workers_dev: false` and `preview_urls: false` on the
   production Worker, so it is reachable only at its custom domain. There is no
   `*.workers.dev` copy of the site to be found.
2. **Build flag.** `PF_NOINDEX=1` puts `noindex, nofollow` on every page.
   `scripts/deploy-preview.mjs` sets it, deploys to a separate Worker name, and
   refuses to deploy if the built homepage is not noindexed.

The flag defaults to **off**, so a production build can never accidentally ship
a site-wide `noindex` — the worst available outcome here.
`test/seo-output.test.ts` asserts both directions: every page noindexed with the
flag on, and **no** page noindexed with it off.

## Launch procedure

Once the domain is on the new deployment (see [deployment.md](./deployment.md)):

**Google Search Console**

1. Add a **Domain** property for `pixelferry.app` (covers every subdomain and
   both protocols) and verify by DNS TXT.
2. Submit `https://pixelferry.app/sitemap-index.xml`.
3. URL-inspect `/`, `/formats` and one `/convert/*` page; confirm the rendered
   HTML contains the body copy — it will, because nothing is client-rendered.
4. Check Page Indexing for **Soft 404**. The old deployment generated them for
   every unknown URL; the count should fall to zero.

**Bing Webmaster Tools**

1. Add the site; import from Search Console if convenient.
2. Submit the same sitemap.

**IndexNow** — not implemented, deliberately. Doing it properly needs
changed-URL detection in the deploy pipeline, and doing it lazily means
submitting every URL on every deploy, which is noise. Bing discovers this site
from the sitemap. Revisit if publishing cadence increases. IndexNow does not
affect Google indexing.

## Auditing

```bash
npm run build
npm run audit:seo       # 1,190 checks over 21 pages
npm run audit:links     # 1,930 checks, 401 internal links
npm run audit:content   # 261 checks, uniqueness and substance
npm run lighthouse      # budgets, mobile; -- --desktop for desktop
```

Lighthouse numbers are **lab** metrics under simulated throttling. They are a
regression gate. Field Core Web Vitals are the 75th percentile of real visitors
and can only come from CrUX or a RUM script once the site has traffic — never
quote a Lighthouse LCP as a field number.
