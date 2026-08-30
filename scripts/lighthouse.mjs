#!/usr/bin/env node
/**
 * Lighthouse against the built site, served by `wrangler dev` so the run sees
 * the real headers and the real 404 handling.
 *
 * These are LAB metrics on an emulated device. They are a regression gate, not
 * a claim about Core Web Vitals — field CWV is measured at the 75th percentile
 * of real visitors and can only come from CrUX or a RUM script once the site
 * has traffic. `docs/seo.md` says so too, so nobody quotes a Lighthouse LCP as
 * a field number.
 *
 *   npm run lighthouse            # mobile, the pages that matter
 *   npm run lighthouse -- --desktop
 *   npm run lighthouse -- --url=/formats
 */
import { spawn } from 'node:child_process'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const OUT = path.join(ROOT, '.lighthouse')
const PORT = 8790
const BASE = `http://127.0.0.1:${PORT}`

const args = process.argv.slice(2)
const desktop = args.includes('--desktop')
const only = args.find((a) => a.startsWith('--url='))?.slice('--url='.length)

/** One representative page per template, not every URL. */
const PAGES = only
  ? [only]
  : ['/', '/formats', '/convert/heic-to-jpg', '/guides/choosing-an-image-format']

/**
 * Budgets. Performance is the only score allowed any slack, because it is the
 * only one that is genuinely variable run to run on a shared CI machine; the
 * rest are deterministic and must be perfect.
 */
const BUDGETS = {
  performance: desktop ? 97 : 95,
  accessibility: 100,
  'best-practices': 100,
  seo: 100,
}

/** Median of N runs, so one noisy sample cannot fail the build. */
const RUNS = Number(process.env.LH_RUNS ?? 3)

function run(command, commandArgs, options = {}) {
  return spawn(command, commandArgs, { stdio: 'ignore', ...options })
}

/**
 * Run Lighthouse once, capturing stderr.
 *
 * A crashed Lighthouse and a failed budget are different events and must be
 * treated differently. This resolves with the outcome instead of throwing, so
 * the caller can retry a crash without swallowing a genuine regression — and it
 * keeps the tool's own error message, which `stdio: 'ignore'` used to discard,
 * leaving a CI failure with nothing to diagnose it from.
 */
function runLighthouse(url, report) {
  return new Promise((resolve) => {
    const child = spawn(
      'npx',
      [
        'lighthouse@13',
        url,
        '--quiet',
        ...(desktop ? ['--preset=desktop'] : ['--form-factor=mobile', '--screenEmulation.mobile']),
        '--output=json',
        `--output-path=${report}`,
        '--chrome-flags=--headless=new --no-sandbox --disable-gpu',
      ],
      { cwd: ROOT, stdio: ['ignore', 'ignore', 'pipe'] },
    )
    let stderr = ''
    child.stderr?.on('data', (chunk) => {
      stderr += chunk
    })
    child.on('error', (error) => resolve({ code: -1, stderr: String(error) }))
    child.on('exit', (code) => resolve({ code, stderr }))
  })
}

async function waitFor(url, timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch {
      /* not up yet */
    }
    await new Promise((resolve) => setTimeout(resolve, 400))
  }
  throw new Error(`server did not start at ${url}`)
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

await rm(OUT, { recursive: true, force: true })
await mkdir(OUT, { recursive: true })

const server = run('npx', ['wrangler', 'dev', '--port', String(PORT), '--local'], { cwd: ROOT })
let failed = false

try {
  await waitFor(BASE)

  const summary = []

  for (const page of PAGES) {
    const url = `${BASE}${page}`
    const slug = page === '/' ? 'home' : page.replace(/\W+/g, '-').replace(/^-|-$/g, '')
    const label = `${slug}-${desktop ? 'desktop' : 'mobile'}`
    const samples = []

    for (let attempt = 0; attempt < RUNS; attempt += 1) {
      const report = path.join(OUT, `${label}-${attempt}.json`)

      /*
       * Lighthouse launches a real Chrome, and on a shared CI runner that
       * occasionally dies for reasons unrelated to this site — a failed launch,
       * a port collision, an OOM. One retry separates "the tool fell over" from
       * "the site regressed"; a second consecutive failure is reported with the
       * tool's own stderr rather than a bare exit code.
       */
      let result = await runLighthouse(url, report)
      if (result.code !== 0) {
        console.warn(`  ⚠ lighthouse exited ${result.code} on ${url}; retrying once`)
        result = await runLighthouse(url, report)
      }
      if (result.code !== 0) {
        console.error(`\n✗ lighthouse failed twice on ${url} (exit ${result.code})\n`)
        console.error(result.stderr.trim().split('\n').slice(-25).join('\n'))
        process.exit(1)
      }

      samples.push(JSON.parse(await readFile(report, 'utf8')))
    }

    const scores = {}
    for (const key of Object.keys(BUDGETS)) {
      scores[key] = median(samples.map((s) => Math.round((s.categories[key]?.score ?? 0) * 100)))
    }
    const audits = samples[0].audits
    const metrics = {
      lcp: median(samples.map((s) => s.audits['largest-contentful-paint'].numericValue)),
      cls: median(samples.map((s) => s.audits['cumulative-layout-shift'].numericValue)),
      tbt: median(samples.map((s) => s.audits['total-blocking-time'].numericValue)),
      fcp: median(samples.map((s) => s.audits['first-contentful-paint'].numericValue)),
      bytes: median(samples.map((s) => s.audits['total-byte-weight'].numericValue)),
      requests: (audits['network-requests']?.details?.items ?? []).length,
    }

    summary.push({ page, scores, metrics })

    console.log(`\n${page}  (${desktop ? 'desktop' : 'mobile'}, median of ${RUNS})`)
    for (const [key, value] of Object.entries(scores)) {
      const budget = BUDGETS[key]
      const ok = value >= budget
      if (!ok) failed = true
      console.log(
        `  ${ok ? '✓' : '✗'} ${key.padEnd(15)} ${String(value).padStart(3)}  (budget ${budget})`,
      )
    }
    console.log(
      `    LCP ${(metrics.lcp / 1000).toFixed(2)}s · CLS ${metrics.cls.toFixed(3)} · ` +
        `TBT ${Math.round(metrics.tbt)}ms · FCP ${(metrics.fcp / 1000).toFixed(2)}s · ` +
        `${Math.round(metrics.bytes / 1024)} KiB · ${metrics.requests} requests`,
    )
  }

  await writeFile(
    path.join(OUT, `summary-${desktop ? 'desktop' : 'mobile'}.json`),
    JSON.stringify(summary, null, 2),
  )
} finally {
  server.kill('SIGTERM')
}

if (failed) {
  console.error('\n✗ Lighthouse budgets not met\n')
  process.exit(1)
}
console.log('\n✓ Lighthouse budgets met\n')
