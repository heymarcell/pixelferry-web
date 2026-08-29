# Architecture

## What this is

A static marketing site. Twenty HTML pages, built once, served as files.

There is no server, no database, no SSR, no on-demand rendering, no API in this
repository, and no framework runtime in the browser. The homepage ships about 2
KB of gzipped JavaScript; every other page ships under 300 bytes.

## Why static Astro

The previous build was a React 19 + Vite SPA: three HTML entries, a shared
`bootstrap` chunk that mounted React on `<div id="root">`, and Motion driving
the entrance animations.

That architecture cost about 98 KB of gzipped JavaScript to render text that
never changes, and it failed in the way client-rendered content fails — in
production, Motion's entrance animation did not run, and the hero headline, the
pitch and the waitlist form stayed at `opacity: 0` permanently. There was no
error to catch. (Evidence: `audits/astro-seo-rebuild-2026-08-29.md` §1.)

Astro's model removes the failure mode rather than mitigating it. Components
render to HTML at build time and ship no JavaScript unless a `<script>` asks for
it. The text is in the document; nothing has to succeed for it to be readable.

Static also means the CDN serves a file. There is no cold start, no runtime to
patch, and no way for a deploy to make the site dynamic by accident.

## Rendering model

```
src/pages/*.astro          →  dist/*.html          (built once, at build time)
src/content/{conversions,guides}/*.md
                           →  dist/convert/*.html, dist/guides/*.html
```

`build.format: 'file'` emits `privacy.html` rather than `privacy/index.html`,
and Cloudflare's `html_handling: "auto-trailing-slash"` serves that at
`/privacy`. Combined with `trailingSlash: 'never'`, every public URL the old
deployment served is served identically by the new one — including the redirects
from `/privacy/` and `/privacy.html`.

## The JavaScript that does ship

Two modules, both progressive enhancement, both external files (never inline —
see [seo.md](./seo.md#content-security-policy) for why that is load-bearing).

**`src/lib/waitlist.ts`** (1,762 B gzip) upgrades a real HTML form into a
fetch + Turnstile challenge. Without it the form is still a valid, labelled,
browser-validated form; it simply has no JavaScript submit handler.

**The reveal observer** (354 B gzip, inline in `BaseLayout.astro`) adds
`js-reveal` to `<html>` and then reveals `[data-reveal]` elements as they enter
the viewport. The ordering is the point: the hidden state is defined under
`.js-reveal`, so it only exists once the script has run. If the script never
runs, nothing was ever hidden. There is also a 3-second fallback that reveals
everything unconditionally, so a broken observer cannot hide content either.

A third module (`consent-defaults` + `cookie-banner`) exists but is only pulled
into the build when a tracking ID is configured. Today it ships nothing.

## Interaction islands

None. There is no client framework and no hydration. Everything interactive is
plain DOM code against server-rendered markup.

The app-window preview is a particularly deliberate case: it is static markup
with a `role="img"` and one descriptive label, so its simulated buttons never
read as real controls to assistive technology.

## Content collections

`/convert/*` and `/guides/*` come from Markdown in `src/content/` with Zod
schemas in `src/content.config.ts`.

The schemas are demanding on purpose. A conversion page must supply at least
three `whatChanges` entries, at least one real `limitation`, two `useCases`, and
a `macOSAlternative` that names the free built-in route. A page with nothing to
say fails the build rather than shipping as filler. See
[seo.md](./seo.md#the-anti-scaled-content-rule).

## Relationship to the API

The site is almost entirely static. The one exception is the waitlist, which
POSTs JSON to `https://api.pixelferry.app/v1/waitlist` — a **separate**
Cloudflare Worker that lives in the private `pixelferry-app` repo.

That Worker is not duplicated, proxied or wrapped here. The contract between
them is pinned in `src/lib/waitlist-contract.ts` and tested in
`test/waitlist-contract.test.ts`; the constants that must match on both sides
are documented in `CLAUDE.md`.

```
pixelferry.app (static assets)  ──POST /v1/waitlist──▶  api.pixelferry.app (Worker)
                                                              │
                                                              ├─▶ Turnstile siteverify
                                                              ├─▶ D1 (consent record)
                                                              └─▶ Brevo (double opt-in)
```

## Directory map

```
src/
  assets/fonts/        vendored latin-subset woff2 + OFL licences
  components/
    Icon.astro         Lucide geometry, inlined at build
    icons.ts           vendored path data (scripts/sync-icons.mjs)
    seo/               Seo.astro, JsonLd.astro
    landing/           the dark landing design system
    preview/           the static app-window rendering
    forms/             the waitlist form
    content/           shared content-page pieces
  content/             Markdown for conversions and guides
  content.config.ts    the collection schemas
  data/
    product.ts         THE source of truth for product claims
    site.ts            origin, navigation, absoluteUrl()
    legal.ts           verbatim legal copy (do not rewrite)
    queue.ts           the app preview's staged file list
  layouts/             BaseLayout, ContentLayout, LegalLayout
  lib/                 waitlist, consent, schema builders
  pages/               routes
  styles/global.css    @font-face, design tokens, reveals

scripts/               icon generation, the three audits, lighthouse,
                       the WebKit static server, the preview deploy
test/                  vitest
test/e2e/              playwright
```

## What is deliberately absent

No CMS, no database, no SSR, no auth, no server actions, no search service, no
state management library, no component library, no analytics vendor, no edge
middleware, and no Worker script.

Astro was chosen partly to _remove_ application architecture from a content
site. Adding any of the above needs a concrete requirement, not a preference.
