# Deployment

## Target

Static output → **Cloudflare Workers Static Assets**.

No adapter, no Worker script, no `main` in `wrangler.jsonc`. Cloudflare serves
the built files directly and never invokes Worker code.

### Why Workers rather than Pages

The site was on Cloudflare Pages. Workers Static Assets is the current
first-party recommendation for new projects, and — the reason that actually
mattered here — it gives an explicit `not_found_handling` setting.

The Pages deployment answered **HTTP 200 with the SPA shell** for every unknown
URL. That is a soft 404 across the entire URL space: Search indexes junk URLs,
finds the homepage at each of them, and the site accumulates duplicate-content
noise. `not_found_handling: "404-page"` returns a real 404 with the real 404
page, and `test/e2e/http.spec.ts` asserts it against real workerd.

Workers also supports `_headers` and `_redirects` natively, serves static assets
without executing Worker code, and leaves room to add a Worker later without
converting the site architecture again.

The tradeoff is honest: Pages was working, and this is a migration with a
cutover. It is reversible — the Pages project stays deployed and keeps the
domain until someone deliberately moves it (see **Cutover**), and moving back is
a single dashboard action.

## Configuration

`wrangler.jsonc`:

```jsonc
{
  "name": "pixelferry-web",
  "compatibility_date": "2026-08-29",
  "assets": {
    "directory": "./dist",
    "not_found_handling": "404-page", // a real 404, not the SPA shell
    "html_handling": "auto-trailing-slash", // serves privacy.html at /privacy
  },
  "workers_dev": false, // no *.workers.dev copy to compete in Search
  "preview_urls": false,
}
```

The custom domain is **deliberately not declared**. Adding
`"routes": [{ "pattern": "pixelferry.app", "custom_domain": true }]` would move
the live domain onto this Worker on the next `wrangler deploy` — that is the
cutover, and it must be a decision rather than a side effect.

## Headers

`public/_headers` is copied to `dist/` by the build and applied by Cloudflare.

- **CSP with no `'unsafe-inline'`** for scripts or styles. See
  [seo.md](./seo.md#content-security-policy) for the four build settings that
  make that possible and the tests that keep it true.
- HSTS, `X-Content-Type-Options`, `X-Frame-Options: DENY`,
  `Referrer-Policy: strict-origin-when-cross-origin`, a narrow
  `Permissions-Policy`, `Cross-Origin-Opener-Policy: same-origin`,
  `Cross-Origin-Resource-Policy: same-origin`.
- `/_astro/*` → `max-age=31536000, immutable` (the hash is in the filename).
- HTML gets **no** cache rule, so it stays revalidatable and a deploy cannot go
  stale. Cloudflare's default (`public, max-age=0, must-revalidate`) is correct
  and deliberately not overridden.

Turnstile needs `challenges.cloudflare.com` in **both** `script-src` and
`frame-src`; omit either and the widget silently fails to verify.

> Enabling `PUBLIC_GTM_ID` or `PUBLIC_META_PIXEL_ID` will be **blocked** by this
> CSP until the origins are added. That is deliberate: a tag must not be able to
> load without the policy — and the Privacy and Cookie policies — being updated
> in the same change.

## Environment

Build-time, client-visible, validated by `astro:env` (`astro.config.mjs`). There
are no secrets in this repository.

| Variable                   | Required               | Effect if unset                                                  |
| -------------------------- | ---------------------- | ---------------------------------------------------------------- |
| `PUBLIC_WAITLIST_ENDPOINT` | for a working waitlist | the form falls back to `mailto:` rather than faking a signup     |
| `PUBLIC_WAITLIST_MAILTO`   | no (defaults)          | `beta@pixelferry.app`                                            |
| `PUBLIC_TURNSTILE_SITEKEY` | for production         | the form posts with a null token; the Worker rejects it with 403 |
| `PUBLIC_GTM_ID`            | no                     | no tag, no cookie, no banner, zero consent code                  |
| `PUBLIC_META_PIXEL_ID`     | no                     | as above                                                         |

Production values:

```
PUBLIC_WAITLIST_ENDPOINT=https://api.pixelferry.app/v1/waitlist
PUBLIC_TURNSTILE_SITEKEY=<the LANDING widget sitekey, not the bug-report one>
```

The sitekey must be the landing widget's: the Worker verifies with the matching
secret and pins the action to `waitlist_signup`. A token from another widget
never validates.

## Preview deploys

```bash
node scripts/deploy-preview.mjs
```

Builds with `PF_NOINDEX=1`, verifies the built homepage really is noindexed, and
deploys to a **separate** Worker (`pixelferry-web-preview`). It cannot touch the
production Worker.

Always rebuild without `PF_NOINDEX` before any production deploy.
`test/seo-output.test.ts` asserts that a default build has no `noindex` on any
page, so a stuck flag fails CI.

## Production cutover

**Requires explicit authorisation. Do not perform it as part of a routine
deploy.**

Preconditions:

- [ ] `npm run verify` green on the branch
- [ ] `ci / check` green on the PR
- [ ] preview Worker deployed and manually checked
- [ ] `PUBLIC_WAITLIST_ENDPOINT` and `PUBLIC_TURNSTILE_SITEKEY` set on the
      production build
- [ ] the legal blockers in `audits/astro-seo-rebuild-2026-08-29.md` §9
      resolved, or an explicit decision to launch with the DRAFT badge

Steps:

1. **Deploy the Worker without the domain.**

   ```bash
   npm run build          # with the production env vars set
   npx wrangler deploy    # no custom domain yet — nothing user-facing changes
   ```

2. **Verify the deployment** on its own hostname before it owns the domain.

3. **Attach the custom domain.** Cloudflare dashboard → Workers & Pages →
   `pixelferry-web` → Settings → Domains & Routes → add `pixelferry.app` as a
   custom domain. Cloudflare manages the DNS record and detaches it from the
   Pages project. _This is the moment the live site changes._

4. **Add the `www` redirect.** Rules → Redirect Rules → new rule:
   `hostname eq "www.pixelferry.app"` → dynamic redirect to
   `concat("https://pixelferry.app", http.request.uri.path)`, **301**, preserve
   query string. This closes a duplicate-host issue that predates the migration.

5. **Verify production immediately:**

   ```bash
   curl -sI https://pixelferry.app/ | grep -i content-security-policy
   curl -so /dev/null -w '%{http_code}\n' https://pixelferry.app/definitely-not-real   # expect 404
   curl -so /dev/null -w '%{http_code} %{redirect_url}\n' https://www.pixelferry.app/  # expect 301
   curl -s https://pixelferry.app/sitemap-index.xml | head
   ```

   Then load the homepage and confirm the hero is **visible**, and submit a real
   waitlist signup to confirm the Worker accepts it.

6. **Search Console / Bing** — see [seo.md](./seo.md#launch-procedure).

7. **Leave the Pages project in place** for at least a week. It costs nothing
   and it is the rollback.

## Rollback

The domain is the switch, so rollback is one action and takes effect in seconds:

1. Cloudflare dashboard → Workers & Pages → `pixelferry-web` → Settings →
   Domains & Routes → **remove** `pixelferry.app`.
2. Pages project → Custom domains → **re-add** `pixelferry.app`.
3. Verify: `curl -sI https://pixelferry.app/` shows the Pages headers again.

Nothing else needs undoing. The Worker can stay deployed; without the domain it
is unreachable and inert. The API Worker, D1, the Turnstile widgets and the
Brevo list are untouched by any of this — the site never had server state.

If the Pages project has been deleted by then, rollback means redeploying the
old build from git
(`git checkout <pre-migration-sha> && npm ci && npm run build`) and pointing the
domain at it. **Do not delete the Pages project until the Worker has been live
and healthy for a meaningful period.**

## What must never happen without explicit authorisation

- switching the `pixelferry.app` custom domain
- deleting the Pages project
- changing DNS
- setting `PUBLIC_GTM_ID` or `PUBLIC_META_PIXEL_ID`
- changing anything in `pixelferry-app` — the API Worker, its secrets, the
  consent registry, or the Turnstile configuration
- merging the migration PR
