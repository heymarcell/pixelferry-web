# pixelferry-web

Public marketing / landing site for **PixelFerry** — a fast, native-feeling macOS
batch image converter.

This repo is **public** and holds only the landing page. The product (the Electron
desktop app + Cloudflare backend) lives in the separate **private** monorepo
`pixelferry-app`. The split follows the hybrid topology in that repo's
`docs/devops-plan.md` (§B1): GitHub repos are atomically public or private, so the
public landing page can't share a repo with the private app.

## Status

The **"Coming Soon 2026"** landing page is built: a waitlist hero, a static
rendering of the app window, a three-point promise strip, and a footer.

## Stack

React 19 · TypeScript · Vite 8 · Tailwind v4 (`@tailwindcss/vite`) · Motion 12 ·
lucide-react. Fonts are self-hosted variable woff2 via Fontsource, so the page
makes no third-party requests at runtime.

```bash
npm install
npm run dev        # dev server
npm run build      # tsc -b && vite build
npm run preview    # serve dist/
npm run typecheck  # tsc -b
npm run lint
```

## Design source

The page is a direct implementation of the **`Landing — Coming Soon 2026`** frame
(node `FKjy8`) in the Pencil file at `~/Documents/image-converter`, which is the
authoritative design. Every colour, size, radius, and shadow in
`src/styles/index.css` and the components is a resolved value read out of that
file — not an approximation. Two token scales exist:

- the page's dark palette (`--color-void`, `--color-blue`, …), and
- `--color-ap-*`, the product design system's **light** theme, which is what the
  embedded app-window preview renders in.

If the design moves, re-read it through the Pencil MCP rather than eyeballing the
rendered page.

### Fidelity notes

- The Pencil radial fill specifies gradient *diameters* (120%/80%); CSS takes
  radii, so those become `60% 40%` in `App.tsx`.
- Pencil rotates counter-clockwise from the top-left; CSS rotates clockwise. The
  hero light streaks negate their angles and set `transform-origin: top left`.
- Gradient utilities use explicit `bg-[image:…]` / `bg-[color:…]` hints. Without
  them Tailwind emits a gradient as a `background-color`, which browsers drop.

## Pages

Multi-page build — the legal pages are static documents, so they are real HTML
entries (`index.html`, `privacy.html`, `cookies.html`) rather than client routes.
Real URLs, no routing JS, each independently cacheable and crawlable.

## Waitlist form

The hero form sends signups to `VITE_WAITLIST_ENDPOINT`, with a **required,
unticked consent checkbox** — GDPR consent must be a positive act, so a
pre-ticked box or implied opt-in would not be valid.

Two transports, via `VITE_WAITLIST_FORMAT`:

- `json` (default) — POSTs `{ email, source, consent: { text, textVersion,
  privacyPolicyVersion, at } }` and reads the status code. The `consent` object
  is the proof-of-consent record Privacy Policy §2 requires.
- `form` — POSTs an urlencoded body to a provider form endpoint (Brevo,
  MailerLite, EmailOctopus). Those endpoints send no CORS headers, so the
  response is opaque; that is only acceptable because double opt-in means the
  real confirmation happens over email.

**When `VITE_WAITLIST_ENDPOINT` is unset the form falls back to a `mailto:` link**
rather than faking a successful signup.

Bump `CONSENT_TEXT_VERSION` **and** `PRIVACY_POLICY_VERSION` in
`WaitlistForm.tsx` whenever the consent wording or policy changes.

### Choosing a provider

Policy §2/§4 assume **double opt-in** ("confirmation status", "unconfirmed
registrations deleted within 30 days"). GDPR does not mandate it, but Germany's
UWG §7 makes it the standard for anyone you mail there, and it is the cleanest
proof of consent. Prefer an EU-hosted provider with a signed DPA — Brevo (Paris,
unlimited contacts on free, 300 sends/day) and MailerLite (Lithuania) are
EU-resident; EmailOctopus hosts on AWS EU but is a UK company.

## Tracking and cookie consent

`VITE_GTM_ID` and `VITE_META_PIXEL_ID` are **unset by default**, and with both
unset the site loads no tags, sets no cookies, and shows no banner — verified.

When either is set, `CookieConsent` enforces:

- **Prior blocking.** GTM and the Meta Pixel are injected only after opt-in;
  nothing is requested before that.
- **Google Consent Mode v2.** All four signals (`ad_storage`,
  `analytics_storage`, `ad_user_data`, `ad_personalization`) default to `denied`
  in an inline `<head>` snippet in every HTML entry, and are only ever raised by
  an explicit choice.
- **Symmetric refusal.** "Reject optional" is the same size and prominence as
  "Accept optional"; there is no dismiss-to-consent.
- **Withdrawal.** A "Cookie settings" footer link re-opens the banner; revoking
  a granted category reloads so the tag actually stops.

Verified end-to-end: 0 tracker requests before a choice, 0 after rejecting
(including across reloads), and GTM + Meta Pixel only after accepting.

> ⚠ **Before setting either ID, the Privacy Policy and Cookie Policy must be
> revised.** As written they state the site uses no analytics, advertising, or
> marketing attribution — which stops being true the moment tags are enabled.
> Cookie Policy §3's schedule is generated from `cookieSchedule` in
> `src/data/legal.ts`; verify those names and durations against the live site.

Note: Google requires EEA advertisers to use a **Google-certified CMP** for Ads
features. This hand-rolled banner implements Consent Mode v2 correctly but is not
on that certified list — if you run Google Ads in the EEA, drive consent from a
certified CMP instead and keep this UI only if that CMP supports custom UI.

## Legal pages

`/privacy` and `/cookies` render copy transcribed **verbatim** from the Pencil
design (`KKbOI`, `n0zten`) in `src/data/legal.ts`. Do not rewrite that text — it
is drafted copy pending legal review, and the bracketed placeholders are
deliberate. Both pages carry the design's "DRAFT FOR LEGAL REVIEW" badge.

Still to fill in: `[LEGAL COMPANY NAME]`, `[FULL REGISTERED ADDRESS]`,
`[COMPANY NUMBER]`, `[PRIVACY EMAIL ADDRESS]`, `[DOMAIN]`, the EU-representative
block, and the `[PROVIDER NAME AND COUNTRY]` rows once hosting and the email
provider are chosen. §8 names the Hungarian DPA (NAIH) — confirm that matches
the controller's establishment.

## Before going live

- The canonical URL, OG tags, JSON-LD, `robots.txt` and `sitemap.xml` all use
  `https://pixelferry.app/`. `sitemap.xml` still lists only `/` — add `/privacy`
  and `/cookies`.
- `public/og.jpg` is a 1200×630 render of the hero. Regenerate it after any hero
  change (it is a screenshot of this page, not a hand-made asset).
- Contact links point at `hello@pixelferry.app` and `privacy@pixelferry.app`.
  Create both, or change them.
- As an EU online service provider you likely owe an imprint/Impressum — those
  exact fields are already collected in Privacy Policy §1.

## Accessibility & motion

Reveals run through Motion's `whileInView` and are wrapped in
`MotionConfig reducedMotion="user"`; the CSS also collapses animation durations
under `prefers-reduced-motion`. The app-window preview is exposed as a single
`role="img"` with a descriptive label so its simulated buttons never read as real
controls. A `<noscript>` block carries the headline, pitch, and a contact address.

---

© 2026 heymarcell. All rights reserved. PixelFerry is a proprietary product; this
repository contains only its public marketing site.
