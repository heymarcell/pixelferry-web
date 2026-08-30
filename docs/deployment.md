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

## Launch state — verified 2026-08-30, after PR #2 merged

The last site-code correction landed in `d80f8d6`; commits after it are
documentation and dependency maintenance. **This paragraph deliberately does not
name the current `main`** — an earlier revision did, and went stale the moment
the PR carrying it merged. Always fetch and verify the exact current `main`, and
its CI, immediately before a cutover.

**The site is live on `pixelferry.app`.** It is served by the Pages project
`pixelferry-web`, which already owned both hostnames, so going live needed no
DNS change and no domain switch — only a Direct Upload deploy. Rollback is
therefore a Pages rollback, not a DNS edit; see "Rollback" below.

Verified against the live origin after deploying, from scratch rather than from
the build: real 404 on an unknown path, `/x/` and `/x.html` both 308 to `/x`,
CSP with no `'unsafe-inline'` and no tracker origin, zero third-party requests
on page load, one `<h1>`, no horizontal overflow at 1440px or 390px, and no
`securitypolicyviolation` in Chromium.

**Do not treat a green deploy as a verified one.** Cloudflare rewrites HTML at
the edge, so `dist/` and the served bytes are not the same artefact — the email
obfuscation defect below existed only in production and was invisible to every
check that reads the build output.

**Three of the four original prerequisites are now resolved** — the controller
identity, the mailboxes, and production itself. What remains:

- choose the waitlist retention period, which then unlocks a small `apps/api`
  change to implement the `waitlist_signups` deletion sweep;
- appoint the Article 27 EU representative;
- redirect `www.pixelferry.app` to the apex. It currently answers **200** with
  the same content rather than 301. Every page carries a self-referencing
  absolute canonical to `https://pixelferry.app`, so indexing consolidates and
  this is not urgent — but two hostnames serving one site is still wrong, and
  the fix is a Cloudflare Redirect Rule, which is an edge-config change and so
  needs explicit authorisation.

Nothing here is blocked on site code.

### Email obfuscation — a production-only failure mode

Cloudflare Scrape Shield's "Email Address Obfuscation" is **on**, and it is on
by default. It rewrites every `mailto:` it finds into
`/cdn-cgi/l/email-protection#<hex>` plus an injected decoder script, and renders
visible addresses as `[email protected]`.

That breaks two things this site depends on: the legal pages must name a
reachable controller contact, and an address that needs JavaScript to resolve is
not reachable for a visitor with JavaScript off — and the waitlist's
`<noscript>` fallback exists _only_ for those visitors.

The first fix wrapped two call sites by hand and shipped no guard, so two more
stayed obfuscated in production on every page and nothing failed.
`test/email-obfuscation.test.ts` now enumerates the surface instead: every
rendered `mailto:` and every visible `@pixelferry.app` must sit inside an
`<!--email_off-->` region, the markers must balance, and every footer must still
carry a contact link — so the rule cannot be satisfied by deleting the address.

The guard checks the _precondition_, not the served result, because the rewrite
happens at the edge. **After any deploy that touches a contact address, curl the
live page and grep for `cdn-cgi/l/email-protection`.**

### 1. Legal controller identity — RESOLVED 2026-08-30

The controller is **neongod LLC**, principal address 447 Broadway, 2nd Floor,
New York, NY 10013, United States, organised in Wyoming. Transcribed from the
operator's published imprint at `lenuri.com/imprint` and the `LEGAL-NOTES.md` in
that repository — a published page, not an inference from repository or
Cloudflare account ownership.

Deliberately NOT published, per the position recorded in those notes: the EIN,
the FinCEN beneficial-ownership ID, the member's personal name and the Wyoming
filing ID. No VAT field renders, because a Wyoming LLC has none.
`test/legal-identity.test.ts` enforces all of that.

**Still open: the Article 27 EU representative.** The policy states the position
rather than leaving it blank. The same gap is open on `lenuri.com`, where the
notes conclude one should be appointed before beta — the "occasional processing"
exemption in Art. 27(2) is not arguable for a permanently open signup form.

### 2. Waitlist retention period — never chosen

Nothing in either repository selects one, and nothing deletes
`waitlist_signups`: the API's scheduled sweep covers `bug_reports` and
`activations` only. The policy now says no schedule exists rather than promising
one that does not run.

**The decision comes first, then a small implementation.** Once a period is
chosen, `waitlist_signups` needs a deletion sweep in `apps/api` — the scheduled
handler already runs `sweepBugReports` and `pruneStaleActivations`, so this is a
third job of the same shape, not new infrastructure.

### 3. Mailboxes — RESOLVED 2026-08-30

Cloudflare Email Routing is enabled on `pixelferry.app` (`Status: ready`), with
the three `route*.mx.cloudflare.net` MX records and
`v=spf1 include:_spf.mx.cloudflare.net ~all` in place. Three rules forward every
address the site publishes to the operator's verified destination:

| Address                  | Where it appears on the site        |
| ------------------------ | ----------------------------------- |
| `privacy@pixelferry.app` | the Privacy and Cookie policies     |
| `hello@pixelferry.app`   | the footer contact link             |
| `beta@pixelferry.app`    | the no-JavaScript waitlist fallback |

The catch-all stays disabled and drops, so nothing else is accepted.

**`lenuri.com` has the same defect and it is still open**: no MX records, Email
Routing unconfigured, while `lenuri.com/imprint` publishes `hello@lenuri.com` as
its contact route. `neongod.io` shows `Enabled: true, Status: misconfigured`.

### 4. Cloudflare token cannot complete the target architecture

The current OAuth token holds `workers (write)`, `workers_routes (write)`,
`pages (write)` — and **`zone (read)`**. Attaching a Workers Custom Domain
creates a DNS record in the zone, and the `www` → apex redirect needs a redirect
rule; both require zone **edit**. Neither can be done with this token.

Note the shape of the current production: the `pixelferry-web` **Pages** project
(Direct Upload, `Git Provider: No`) already owns both `pixelferry.app` and
`www.pixelferry.app`, which is why both answer 200 today and why `/nope` answers
200 as well — a soft 404 across the whole URL space. Deploying the new build to
that Pages project would need no DNS change, but it is not the documented target
architecture and it would publish the placeholder legal pages, so it waits on
item 1 regardless.

### Rollback, currently available

Production is untouched and still served by Pages deployment
`e19b072e-5064-42aa-b669-59faea14088b` (source `a365f7e`). Cloudflare retains
it, so rolling back after a future cutover is a Pages rollback to that
deployment. **Do not delete the Pages project during the cutover** — it is the
rollback.

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
- [ ] **the `www` redirect is in place — do this BEFORE the cutover, not after**

### Why `www` has to be redirected first

`www.pixelferry.app` is a **custom domain on the Pages project**, not an alias
of the apex. Today it serves a byte-identical copy of the site (verified: same
sha256 as the apex, both 200, no redirect). Its canonical tag points at the
apex, which is what has kept the duplicate mostly harmless.

The cutover moves **only** `pixelferry.app` onto the Worker. `www` stays on
Pages. So if the redirect is added afterwards, there is a window in which:

- `pixelferry.app` serves the **new** site, and
- `www.pixelferry.app` serves the **old** one,

with `www`'s canonical still pointing at the apex — two hosts, different
content, one claiming to be the other. That is worse than the duplicate it
replaces.

Adding the redirect first removes the window entirely: `www` then 301s to the
apex whatever the apex happens to be serving.

**This cannot be done with Wrangler.** Redirect Rules are part of the Rules
product; `wrangler` has no rules, ruleset, zone or DNS surface at all, and the
OAuth token it uses is scoped `zone (read)`. It needs the dashboard, or an API
token with **Zone → Config → Edit** (or Rulesets edit) on the zone:

> Dashboard → the `pixelferry.app` zone → **Rules → Redirect Rules → Create
> rule**. Match `hostname eq "www.pixelferry.app"`, action **Dynamic redirect**
> to `concat("https://pixelferry.app", http.request.uri.path)`, status **301**,
> **preserve query string** on.

```bash
# Or via the API, with a token that has Zone → Config → Edit:
curl -X POST \
  "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/rulesets/phases/http_request_dynamic_redirect/entrypoint" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rules": [{
      "expression": "(http.host eq \"www.pixelferry.app\")",
      "description": "www -> apex, 301",
      "action": "redirect",
      "action_parameters": {
        "from_value": {
          "status_code": 301,
          "target_url": { "expression": "concat(\"https://pixelferry.app\", http.request.uri.path)" },
          "preserve_query_string": true
        }
      }
    }]
  }'
```

Verify with `curl -sSI https://www.pixelferry.app/` — expect `301` and a
`location:` on the apex.

Leaving `www` attached to the Pages project afterwards is fine: a Redirect Rule
runs at the edge, before the request reaches Pages. Detaching it instead would
make `www` stop resolving, which is worse than redirecting it.

### First: the legacy Pages project must not be able to deploy

The live site is still served by the Cloudflare **Pages** project
`pixelferry-web`. Before merging anything, confirm that merging cannot itself
change production.

A Git-connected Pages project deploys automatically on every push to its
production branch. If `main` were wired up that way, **merging the migration PR
would deploy the new site to `pixelferry.app` immediately** — bypassing this
runbook entirely. It would also almost certainly break the waitlist, because the
old build read `VITE_*` variables and this one reads `PUBLIC_*`; a surprise
build would ship with no endpoint and no Turnstile sitekey.

**Verified state (2026-08-29):** `wrangler pages project list` reports
`Git Provider: No` for `pixelferry-web`, and `wrangler pages download config`
returns no build configuration. It is a **Direct Upload** project, which by
design does not deploy on a push. Its four deployments were all manual uploads;
the most recent matches `main` at `a365f7e` and is a month old. Merging PR #2
therefore cannot change production.

Re-confirm in the dashboard before merging, because this is the one assumption
that would be expensive to get wrong:

> Workers & Pages → `pixelferry-web` → **Settings**. A Direct Upload project has
> no **Build** section and no **Branch control**. If a **Build → Branch
> control** section exists, the project is Git-connected: turn **Enable
> automatic production branch deployments** OFF before merging.

Do not change that setting as part of this task — it is a production
configuration change and needs its own authorisation.

### Then the cutover

1. **Deploy the Worker without the domain.**

   ```bash
   npm run build          # with the production env vars set
   npx wrangler deploy    # no custom domain yet — nothing user-facing changes
   ```

2. **Understand what can and cannot be verified here.**

   The production Worker has **no hostname of its own**. `workers_dev: false`
   and `preview_urls: false` are deliberate — they are what guarantees no
   `*.workers.dev` duplicate of the site exists for Search to find. The
   consequence is that this deployed-but-undomained Worker is genuinely
   unreachable, and there is nothing to open.

   That is the intended trade, and it is why the **preview Worker** exists.
   `pixelferry-web-preview` serves the same `dist/`, from the same `assets`
   configuration, with the same `_headers` — so the 404 handling, the redirects,
   the CSP and the caching are all verified there, on real Cloudflare
   infrastructure, before this step. The only difference is that the preview
   build is noindexed; the production build's indexability is asserted by
   `test/seo-output.test.ts` rather than by looking at a page.

   **If you need to verify the exact production artifact before it is live**,
   there is a supported way, and it is account configuration rather than
   something this repo can do:

   - Set `preview_urls: true` on the production Worker and use
     `wrangler versions upload`, which uploads a version **without deploying
     it** and returns a `<version>-pixelferry-web.<subdomain>.workers.dev` URL.
   - **Protect that URL with Cloudflare Access first.** Without it you have
     created exactly the indexable duplicate the config exists to prevent — an
     indexable production build on a second hostname.
   - Turn `preview_urls` back off afterwards.

   Do not do this casually. The preview Worker covers the behaviour; this only
   adds "the bytes I am about to promote", and it costs a temporary second
   hostname.

3. **Attach the custom domain.** Cloudflare dashboard → Workers & Pages →
   `pixelferry-web` → Settings → Domains & Routes → add `pixelferry.app` as a
   custom domain. Cloudflare manages the DNS record and detaches it from the
   Pages project. _This is the moment the live site changes._

4. **Confirm the `www` redirect is live** (it should already be — see the
   precondition above). If it is not, `www.pixelferry.app` is right now serving
   the OLD Pages build while the apex serves the new one. Fix that before
   announcing anything.

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

## Merge safety

Merging the migration PR is safe **only while the Pages project stays Direct
Upload**. Re-check that before every merge that touches the build — see the
first section of the cutover above. If the project is ever connected to Git,
turn off automatic production branch deployments before merging anything.

## What must never happen without explicit authorisation

- switching the `pixelferry.app` custom domain
- enabling or disabling Pages automatic production deployments
- enabling `preview_urls` or `workers_dev` on the production Worker without
  Cloudflare Access in front of them
- deleting the Pages project
- changing DNS
- setting `PUBLIC_GTM_ID` or `PUBLIC_META_PIXEL_ID`
- changing anything in `pixelferry-app` — the API Worker, its secrets, the
  consent registry, or the Turnstile configuration
- merging the migration PR
