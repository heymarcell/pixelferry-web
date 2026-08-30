import { expect, test, type Page, type Route } from '@playwright/test'

/**
 * The waitlist is production infrastructure, not a mock marketing form. These
 * tests exercise the real built module against a stubbed Turnstile and a
 * stubbed endpoint, and assert the EXACT request body the Worker validates.
 *
 * No real address is ever used, and no request ever leaves the machine —
 * every external route is intercepted.
 */

const ENDPOINT_GLOB = '**/api.pixelferry.app/**'
const TURNSTILE_GLOB = '**/challenges.cloudflare.com/**'
const TEST_EMAIL = 'nobody@example.invalid'

/**
 * Replace Cloudflare's api.js with a stub that installs a `window.turnstile`
 * behaving like the real one: `execute()` resolves through the callback the
 * widget was rendered with.
 */
async function stubTurnstile(
  page: Page,
  { token }: { token: string | null } = { token: 'tok_test' },
) {
  await page.route(TURNSTILE_GLOB, (route: Route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: `
        window.__turnstileRenders = 0;
        window.__turnstileResets = 0;
        window.turnstile = {
          render(el, opts) {
            window.__turnstileRenders++;
            window.__turnstileOpts = {
              sitekey: opts.sitekey, action: opts.action,
              appearance: opts.appearance, execution: opts.execution,
            };
            window.__cb = opts.callback;
            return 'widget-1';
          },
          execute() {
            const token = ${JSON.stringify(token)};
            setTimeout(() => window.__cb(token), 0);
          },
          reset() { window.__turnstileResets++; },
          remove() {},
        };
      `,
    }),
  )
}

/** Capture the request the form makes, and answer with `status`. */
async function stubEndpoint(page: Page, status: number, bodies: unknown[]) {
  await page.route(ENDPOINT_GLOB, async (route: Route) => {
    bodies.push(route.request().postDataJSON())
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(status === 202 ? { pending: true } : { error: 'nope' }),
    })
  })
}

async function fillForm(page: Page, email = TEST_EMAIL) {
  await page.getByRole('textbox', { name: /email/i }).fill(email)
  await page.getByRole('checkbox').check()
}

test.describe('waitlist form', () => {
  test('does not request Turnstile until the visitor engages', async ({ page }) => {
    const requested: string[] = []
    page.on('request', (r) => {
      if (r.url().includes('challenges.cloudflare.com')) requested.push(r.url())
    })
    await stubTurnstile(page)

    await page.goto('/', { waitUntil: 'networkidle' })
    expect(requested, 'a page view must make no Turnstile request').toEqual([])

    // First interaction warms it.
    await page.getByRole('textbox', { name: /email/i }).focus()
    await expect.poll(() => requested.length).toBeGreaterThan(0)
  })

  test('sends exactly the body the Worker validates', async ({ page }) => {
    const bodies: unknown[] = []
    await stubTurnstile(page)
    await stubEndpoint(page, 202, bodies)

    await page.goto('/')
    await fillForm(page)
    await page.getByRole('button', { name: /join waitlist/i }).click()

    await expect(page.getByText(/check your inbox and confirm/i)).toBeVisible()
    expect(bodies).toHaveLength(1)

    const body = bodies[0] as Record<string, unknown>
    expect(body.email).toBe(TEST_EMAIL)
    expect(body.source).toBe('landing')
    expect(body.turnstileToken).toBe('tok_test')
    expect(body.consent).toMatchObject({
      given: true,
      // Byte-exact: the server compares against its own registry copy.
      text: 'I agree to PixelFerry product and early-access emails. Unsubscribe anytime.',
      textVersion: '2026-07-26.1',
      privacyPolicyVersion: '2026-07-25',
    })
    expect((body.consent as { at: string }).at).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  test('renders the same consent wording it sends', async ({ page }) => {
    await page.goto('/')
    await expect(
      page.getByText('I agree to PixelFerry product and early-access emails. Unsubscribe anytime.'),
    ).toBeVisible()
  })

  test('pins the Turnstile action the Worker expects', async ({ page }) => {
    await stubTurnstile(page)
    await page.goto('/')
    await page.getByRole('textbox', { name: /email/i }).focus()

    await expect
      .poll(() =>
        page.evaluate(() => (window as never as { __turnstileOpts?: unknown }).__turnstileOpts),
      )
      .toBeTruthy()

    const opts = await page.evaluate(
      () => (window as never as { __turnstileOpts: Record<string, string> }).__turnstileOpts,
    )
    // A mismatch with TURNSTILE_EXPECTED_ACTION_WAITLIST 403s every signup.
    expect(opts.action).toBe('waitlist_signup')
    // Invisible until a challenge is genuinely required, and deferred to submit.
    expect(opts.appearance).toBe('interaction-only')
    expect(opts.execution).toBe('execute')
  })

  test('the consent box is unticked and required', async ({ page }) => {
    const bodies: unknown[] = []
    await stubTurnstile(page)
    await stubEndpoint(page, 202, bodies)
    await page.goto('/')

    const consent = page.getByRole('checkbox')
    // GDPR consent must be a positive act; a pre-ticked box is not consent.
    await expect(consent).not.toBeChecked()

    await page.getByRole('textbox', { name: /email/i }).fill(TEST_EMAIL)
    await page.getByRole('button', { name: /join waitlist/i }).click()

    await page.waitForTimeout(300)
    expect(bodies, 'submitting without consent must send nothing').toHaveLength(0)
  })

  test('a malformed address never reaches the network', async ({ page }) => {
    const bodies: unknown[] = []
    await stubTurnstile(page)
    await stubEndpoint(page, 202, bodies)
    await page.goto('/')

    await page.getByRole('textbox', { name: /email/i }).fill('not-an-email')
    await page.getByRole('checkbox').check()
    await page.getByRole('button', { name: /join waitlist/i }).click()

    await page.waitForTimeout(300)
    expect(bodies).toHaveLength(0)
  })

  test.describe('failure handling', () => {
    test('403 says verification failed and clears the spent token', async ({ page }) => {
      const bodies: unknown[] = []
      await stubTurnstile(page)
      await stubEndpoint(page, 403, bodies)
      await page.goto('/')
      await fillForm(page)
      await page.getByRole('button', { name: /join waitlist/i }).click()

      await expect(page.getByText(/could not verify you are human/i)).toBeVisible()
      // A Turnstile token is single-use; a retry must run a fresh challenge.
      expect(
        await page.evaluate(
          () => (window as never as { __turnstileResets: number }).__turnstileResets,
        ),
      ).toBeGreaterThan(0)
      // The CTA comes back so the visitor can retry.
      await expect(page.getByRole('button', { name: /join waitlist/i })).toBeEnabled()
    })

    test('429 tells the visitor to wait rather than retry', async ({ page }) => {
      await stubTurnstile(page)
      await stubEndpoint(page, 429, [])
      await page.goto('/')
      await fillForm(page)
      await page.getByRole('button', { name: /join waitlist/i }).click()
      await expect(page.getByText(/too many attempts/i)).toBeVisible()
    })

    test('a 500 is a generic error', async ({ page }) => {
      await stubTurnstile(page)
      await stubEndpoint(page, 500, [])
      await page.goto('/')
      await fillForm(page)
      await page.getByRole('button', { name: /join waitlist/i }).click()
      await expect(page.getByText(/didn't go through/i)).toBeVisible()
    })

    test('a network failure is an error, never a fake success', async ({ page }) => {
      await stubTurnstile(page)
      await page.route(ENDPOINT_GLOB, (route) => route.abort('failed'))
      await page.goto('/')
      await fillForm(page)
      await page.getByRole('button', { name: /join waitlist/i }).click()
      await expect(page.getByText(/didn't go through/i)).toBeVisible()
      await expect(page.getByText(/check your inbox/i)).toBeHidden()
    })

    test('a failed challenge never posts', async ({ page }) => {
      const bodies: unknown[] = []
      await stubTurnstile(page, { token: null })
      await stubEndpoint(page, 202, bodies)
      await page.goto('/')
      await fillForm(page)
      await page.getByRole('button', { name: /join waitlist/i }).click()

      await expect(page.getByText(/could not verify you are human/i)).toBeVisible()
      expect(bodies, 'no token means no request').toHaveLength(0)
    })
  })

  test('cannot be submitted twice', async ({ page }) => {
    const bodies: unknown[] = []
    await stubTurnstile(page)
    await stubEndpoint(page, 202, bodies)
    await page.goto('/')
    await fillForm(page)

    const submit = page.getByRole('button', { name: /join waitlist/i })
    await submit.click()
    await expect(page.getByText(/check your inbox/i)).toBeVisible()

    // The button is disabled and relabelled once the signup is in.
    await expect(page.getByRole('button', { name: /you're in/i })).toBeDisabled()
    await page.keyboard.press('Enter')
    await page.waitForTimeout(200)
    expect(bodies).toHaveLength(1)
  })

  test('?confirmed=1 shows the confirmed state', async ({ page }) => {
    // Brevo returns the visitor here after they click the confirmation link.
    await page.goto('/?confirmed=1')
    await expect(page.getByText(/you're on the list/i)).toBeVisible()
  })

  test('the confirmed variant still canonicalises to the bare homepage', async ({ page }) => {
    await page.goto('/?confirmed=1')
    expect(await page.getAttribute('link[rel="canonical"]', 'href')).toBe('https://pixelferry.app/')
  })

  test('announces its status politely', async ({ page }) => {
    await page.goto('/')
    const status = page.locator('#waitlist-status')
    await expect(status).toHaveAttribute('role', 'status')
    await expect(status).toHaveAttribute('aria-live', 'polite')
    // The email field points at it, so the message is associated with the input.
    await expect(page.getByRole('textbox', { name: /email/i })).toHaveAttribute(
      'aria-describedby',
      'waitlist-status',
    )
  })

  test('is operable entirely from the keyboard', async ({ page, browserName }) => {
    /*
     * Safari ships with "Press Tab to highlight each item on a webpage" OFF,
     * so WebKit's Tab key moves between text fields only and skips links and
     * checkboxes. That is a browser preference, not a page defect — the
     * controls are focusable, which `every interactive control has a visible
     * focus indicator` proves in WebKit by calling focus() directly.
     */
    test.skip(browserName === 'webkit', 'WebKit Tab order follows the Safari preference')
    const bodies: unknown[] = []
    await stubTurnstile(page)
    await stubEndpoint(page, 202, bodies)
    await page.goto('/')

    await page.getByRole('textbox', { name: /email/i }).focus()
    await page.keyboard.type(TEST_EMAIL)
    await page.keyboard.press('Tab') // → submit
    await page.keyboard.press('Tab') // → consent checkbox
    await expect(page.getByRole('checkbox')).toBeFocused()
    await page.keyboard.press('Space')
    await expect(page.getByRole('checkbox')).toBeChecked()
    await page.keyboard.press('Enter')

    await expect(page.getByText(/check your inbox/i)).toBeVisible()
    expect(bodies).toHaveLength(1)
  })
})
