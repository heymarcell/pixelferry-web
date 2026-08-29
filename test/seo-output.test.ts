import { execFile } from 'node:child_process'
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { beforeAll, describe, expect, it } from 'vitest'

const run = promisify(execFile)
const ROOT = path.dirname(import.meta.dirname)
const DIST = path.join(ROOT, 'dist')

async function html(file: string) {
  return readFile(path.join(DIST, file), 'utf8')
}

/**
 * Assertions about the built output that the standalone audits cannot make,
 * because they need a SECOND build with a different flag.
 *
 * `npm run verify` builds before it tests, so `dist/` is present.
 */
describe('built output', () => {
  beforeAll(async () => {
    await readdir(DIST).catch(() => {
      throw new Error('dist/ is missing — run `npm run build` before `npm test`')
    })
  })

  it('renders the hero headline into static HTML', async () => {
    // The React build shipped the headline inside a client-rendered island
    // whose entrance animation never completed in production, leaving the
    // whole hero at opacity 0. Server-rendered text cannot fail that way.
    const page = await html('index.html')
    expect(page).toContain('Mixed formats.')
    expect(page).toContain('One clean batch.')
  })

  it('never hides content behind a JS-only reveal', async () => {
    // `data-reveal` elements are only hidden once the enhancement script adds
    // `js-reveal` to <html>. If that class were in the static markup, content
    // would start invisible again.
    const page = await html('index.html')
    expect(page).not.toMatch(/<html[^>]*class="[^"]*js-reveal/)
  })

  it('ships no framework runtime', async () => {
    const files = await readdir(path.join(DIST, '_astro'))
    const scripts = files.filter((f) => f.endsWith('.js'))
    const sizes = await Promise.all(
      scripts.map(async (f) => (await readFile(path.join(DIST, '_astro', f))).byteLength),
    )
    const total = sizes.reduce((sum, n) => sum + n, 0)
    // A React + Motion runtime is ~274 KB. Anything approaching that means a
    // framework crept back in.
    expect(total).toBeLessThan(20_000)

    for (const file of scripts) {
      const code = await readFile(path.join(DIST, '_astro', file), 'utf8')
      expect(code).not.toMatch(/react-dom|createRoot|__REACT/)
    }
  })

  it('emits a real 404 page that is noindex', async () => {
    const page = await html('404.html')
    expect(page).toMatch(/<meta name="robots" content="noindex, nofollow">/)
  })

  it('does not ship consent or tracking code when no tag is configured', async () => {
    const files = await readdir(path.join(DIST, '_astro'))
    for (const file of files.filter((f) => f.endsWith('.js'))) {
      const code = await readFile(path.join(DIST, '_astro', file), 'utf8')
      expect(code).not.toContain('googletagmanager.com')
      expect(code).not.toContain('connect.facebook.net')
    }
    const page = await html('index.html')
    expect(page).not.toContain('gtag')
    expect(page).not.toContain('dataLayer')
  })

  it('does not reference Turnstile from the initial HTML', async () => {
    // The script is fetched on first interaction with the form, so a page view
    // makes zero third-party requests.
    const page = await html('index.html')
    expect(page).not.toContain('challenges.cloudflare.com')
  })

  it('serves the SoftwareApplication with the correct minimum OS', async () => {
    const page = await html('index.html')
    const block = page.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)?.[1]
    expect(block).toBeTruthy()
    const data = JSON.parse(block!) as Record<string, unknown>[]
    const app = data.find((node) => node['@type'] === 'SoftwareApplication')
    expect(app?.operatingSystem).toBe('macOS 14 (Sonoma) or later')
    expect(app).not.toHaveProperty('offers')
    expect(app).not.toHaveProperty('aggregateRating')
  })
})

/**
 * The preview-indexing gate, checked in BOTH directions.
 *
 * A test that only proves `PF_NOINDEX=1` adds a noindex would still pass if
 * the flag were stuck on and production shipped a site-wide noindex — the
 * single worst outcome available here. So the default build is asserted to
 * have none.
 */
describe('preview noindex flag', () => {
  let previewDir: string

  beforeAll(async () => {
    previewDir = await mkdtemp(path.join(tmpdir(), 'pf-noindex-'))
    await run('npx', ['astro', 'build', '--outDir', previewDir], {
      cwd: ROOT,
      env: { ...process.env, PF_NOINDEX: '1' },
    })
  }, 120_000)

  it('puts noindex on every page of a preview build', async () => {
    const files = (await readdir(previewDir)).filter((f) => f.endsWith('.html'))
    expect(files.length).toBeGreaterThan(0)
    for (const file of files) {
      const page = await readFile(path.join(previewDir, file), 'utf8')
      expect(page, `${file} should be noindex in a preview build`).toContain(
        'content="noindex, nofollow"',
      )
    }
    await rm(previewDir, { recursive: true, force: true })
  })

  it('puts noindex on NO page of the production build', async () => {
    const files = (await readdir(DIST)).filter((f) => f.endsWith('.html') && f !== '404.html')
    expect(files.length).toBeGreaterThan(0)
    for (const file of files) {
      const page = await readFile(path.join(DIST, file), 'utf8')
      expect(page, `${file} must be indexable in a production build`).toContain(
        'content="index, follow"',
      )
    }
  })
})
