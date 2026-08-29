#!/usr/bin/env node
/**
 * A minimal static server for `dist/`, used ONLY by the Playwright `safari`
 * project.
 *
 * Why this exists: Playwright's WebKit build cannot complete a request to
 * `wrangler dev` on this platform — it times out on every address, while the
 * same WebKit reaches a plain Node server on loopback fine. So Chromium tests
 * against real workerd (and therefore against the real `not_found_handling`,
 * `html_handling` and `_headers`), and WebKit tests rendering and behaviour
 * here.
 *
 * The response headers are READ FROM `dist/_headers` rather than restated, so
 * the CSP WebKit is tested against is the one that ships. The URL mapping is a
 * small re-implementation of Cloudflare's `auto-trailing-slash`; it is only
 * used to reach pages, and `test/e2e/http.spec.ts` verifies the real behaviour
 * against workerd in the Chromium project.
 */
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const DIST = path.join(ROOT, 'dist')
const PORT = Number(process.env.PORT ?? 8789)

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
}

/** Parse the `/*` block out of dist/_headers — the rules that apply to every path. */
async function globalHeaders() {
  const text = await readFile(path.join(DIST, '_headers'), 'utf8').catch(() => '')
  const headers = {}
  let inGlobal = false
  for (const line of text.split('\n')) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue
    if (!line.startsWith(' ') && !line.startsWith('\t')) {
      inGlobal = line.trim() === '/*'
      continue
    }
    if (!inGlobal) continue
    const at = line.indexOf(':')
    if (at > 0) headers[line.slice(0, at).trim()] = line.slice(at + 1).trim()
  }
  return headers
}

/*
 * Two directives have to come off for a plain-HTTP loopback origin, and only
 * these two:
 *
 *   `upgrade-insecure-requests` — WebKit rewrites every subresource to
 *   https://127.0.0.1:PORT, which has no TLS listener, so the whole page
 *   fails to load its CSS, fonts and scripts. (Chromium exempts loopback as a
 *   potentially-trustworthy origin; WebKit does not.)
 *
 *   `Strict-Transport-Security` — pins the 127.0.0.1 host to HTTPS for a year
 *   in the browser profile, which then breaks every other local server on it.
 *
 * Both exist to force transport that this harness does not have, and neither
 * affects what the rest of the CSP allows. Everything else — script-src,
 * style-src, connect-src, frame-ancestors — is passed through verbatim from
 * the shipped file, so WebKit is tested against the real policy.
 */
const HEADERS = await globalHeaders()
delete HEADERS['Strict-Transport-Security']
if (HEADERS['Content-Security-Policy']) {
  HEADERS['Content-Security-Policy'] = HEADERS['Content-Security-Policy']
    .split(';')
    .map((directive) => directive.trim())
    .filter((directive) => directive !== 'upgrade-insecure-requests')
    .join('; ')
}

async function resolveFile(urlPath) {
  const clean = decodeURIComponent(urlPath.split('?')[0])
  const candidates =
    clean === '/'
      ? ['index.html']
      : [clean.slice(1), `${clean.slice(1)}.html`, path.join(clean.slice(1), 'index.html')]

  for (const candidate of candidates) {
    const full = path.join(DIST, candidate)
    if (!full.startsWith(DIST)) continue // path traversal
    const info = await stat(full).catch(() => null)
    if (info?.isFile()) return full
  }
  return null
}

createServer(async (request, response) => {
  const file = await resolveFile(request.url ?? '/')
  const target = file ?? path.join(DIST, '404.html')
  const body = await readFile(target).catch(() => Buffer.from('Not found'))

  response.writeHead(file ? 200 : 404, {
    ...HEADERS,
    'Content-Type': TYPES[path.extname(target)] ?? 'application/octet-stream',
    'Content-Length': body.byteLength,
  })
  response.end(body)
}).listen(PORT, '127.0.0.1', () => {
  console.log(
    `serving dist/ on http://127.0.0.1:${PORT} with ${Object.keys(HEADERS).length} headers`,
  )
})
