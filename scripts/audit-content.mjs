#!/usr/bin/env node
/**
 * Content-quality audit — the anti-scaled-content gate.
 *
 * Google treats mass-produced pages with little added value as spam
 * ("scaled content abuse"), whether or not a machine wrote them. A
 * template-driven `/convert/*` architecture is exactly the shape that goes
 * wrong, so this measures the thing that actually distinguishes a useful set
 * of pages from a doorway farm: how much of each page is unique to it.
 *
 * Failing here means writing, not tuning a threshold.
 *
 *   npm run audit:content   (after npm run build)
 */
import { Report, loadPages, indexable } from './lib/pages.mjs'

const report = new Report('Content audit')
const pages = indexable(await loadPages())

/** Pages generated from a shared template, where duplication is the risk. */
const templated = pages.filter((page) => /^(convert|guides)\//.test(page.rel))

/** Visible prose of the <main> element, collapsed. */
function bodyText(page) {
  const main = page.dom.querySelector('main') ?? page.dom
  return main.text.replace(/\s+/g, ' ').trim()
}

/** Shingles: overlapping 8-word windows, the standard near-duplicate unit. */
function shingles(text, size = 8) {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(Boolean)
  const set = new Set()
  for (let i = 0; i + size <= words.length; i += 1) set.add(words.slice(i, i + size).join(' '))
  return set
}

function jaccard(a, b) {
  let shared = 0
  for (const item of a) if (b.has(item)) shared += 1
  const union = a.size + b.size - shared
  return union === 0 ? 0 : shared / union
}

const profiles = templated.map((page) => {
  const text = bodyText(page)
  return { page, text, words: text.split(/\s+/).length, shingles: shingles(text) }
})

// ── Substance ─────────────────────────────────────────────────────────────
for (const { page, words } of profiles) {
  // Not a word-count target to pad to — a floor below which a page is not
  // saying anything a reader could not have guessed.
  report.check(words >= 550, `${page.rel}: only ${words} words of body copy — too thin to publish`)
}

// ── Uniqueness ────────────────────────────────────────────────────────────
//
// The real test. Two pages built from the same template share their headings
// and CTA, so some overlap is structural and expected; anything above this is
// one page rewritten with the format names swapped.
const MAX_SIMILARITY = 0.28

for (let i = 0; i < profiles.length; i += 1) {
  for (let j = i + 1; j < profiles.length; j += 1) {
    const a = profiles[i]
    const b = profiles[j]
    const score = jaccard(a.shingles, b.shingles)
    report.check(
      score <= MAX_SIMILARITY,
      `${a.page.rel} and ${b.page.rel} are ${(score * 100).toFixed(1)}% similar ` +
        `(limit ${(MAX_SIMILARITY * 100).toFixed(0)}%) — rewrite one, do not reword it`,
    )
  }
}

// ── Distinct openings ─────────────────────────────────────────────────────
// A shared opening paragraph across a page set is the clearest doorway signal.
const openings = new Map()
for (const { page, text } of profiles) {
  const opening = text.slice(0, 160).toLowerCase()
  const seen = openings.get(opening)
  report.check(!seen, `${page.rel}: opens identically to ${seen}`)
  openings.set(opening, page.rel)
}

// ── Honesty markers ───────────────────────────────────────────────────────
// Every conversion page must state a real limitation. A page that only sells
// is the page this architecture must never become.
for (const page of pages.filter((p) => p.rel.startsWith('convert/'))) {
  const headings = page.dom.querySelectorAll('h2').map((h) => h.text.toLowerCase())
  report.check(
    headings.some((h) => h.includes('limitation')),
    `${page.rel}: no limitations section`,
  )
  report.check(
    headings.some((h) => h.includes('macos already')),
    `${page.rel}: does not name the built-in macOS alternative`,
  )
}

// ── Forbidden claims ──────────────────────────────────────────────────────
//
// Fabricated trust signals and the marketing vocabulary this site does not
// use. `awards` and `rated` catch invented credibility; the rest is tone.
const FORBIDDEN = [
  {
    pattern: /\b\d+[,\d]*\+? (?:downloads|users|customers|installs)\b/i,
    why: 'invented adoption number',
  },
  { pattern: /\b(?:rated|rating of) \d(?:\.\d)? (?:stars?|\/ ?5)\b/i, why: 'invented rating' },
  { pattern: /\baward[- ]winning\b/i, why: 'unverified award claim' },
  {
    pattern: /\b(?:revolutionary|game[- ]changing|cutting[- ]edge|best[- ]in[- ]class)\b/i,
    why: 'empty superlative',
  },
  { pattern: /\bseamless(?:ly)?\b/i, why: 'banned filler word' },
  { pattern: /\bworld[’']?s (?:best|fastest|leading)\b/i, why: 'unverifiable superlative' },
]

for (const page of pages) {
  const text = bodyText(page)
  for (const { pattern, why } of FORBIDDEN) {
    const match = text.match(pattern)
    report.check(!match, `${page.rel}: ${why} — "${match?.[0]}"`)
  }
}

const worst =
  profiles.length > 1
    ? Math.max(
        ...profiles.flatMap((a, i) =>
          profiles.slice(i + 1).map((b) => jaccard(a.shingles, b.shingles)),
        ),
      )
    : 0

console.log(
  `  ${profiles.length} templated pages, ` +
    `${Math.round(profiles.reduce((sum, p) => sum + p.words, 0) / profiles.length)} words average, ` +
    `worst-pair similarity ${(worst * 100).toFixed(1)}%`,
)
report.finish()
