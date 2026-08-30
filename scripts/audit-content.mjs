#!/usr/bin/env node
/**
 * Content-quality audit — the anti-scaled-content gate.
 *
 * ── WHAT A GREEN RUN DOES NOT MEAN ────────────────────────────────────────
 *
 * It does NOT mean the technical content is true. This file measures
 * duplication, substance and the recurrence of SPECIFIC phrases already proven
 * false. It cannot evaluate a claim it has never seen, and regex is not a
 * truth engine.
 *
 * Factual accuracy is a research gate against primary evidence — the app's
 * executable source first, then Apple/WebKit, the format specification, MDN,
 * and the codec vendors' own studies. See `docs/content-sources.md` for the
 * standard and the evidence table, and CLAUDE.md for the rule. Two separate
 * reviews found confidently-written, plausible, wrong statements that every
 * automated check here passed.
 *
 * Never describe a green `audit:content` as meaning the content is correct.
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
import { Report, loadPages, indexable, claimSurface } from './lib/pages.mjs'

const report = new Report('Content audit')
const pages = indexable(await loadPages())

/** Pages generated from a shared template, where duplication is the risk. */
const templated = pages.filter((page) => /^(convert|guides)\//.test(page.rel))

/**
 * Visible prose of the <main> element, collapsed.
 *
 * Tags become a SPACE rather than being deleted. `.text` concatenates raw text
 * nodes, so a heading ending "…in the file" followed by "Compression model"
 * becomes "fileCompression" — which both distorts the shingles and buries the
 * genuine run-together words this file also looks for.
 */
/**
 * Everything the page publishes as a claim — visible prose AND head metadata.
 *
 * The known-false patterns below used to run against `bodyText` only, so a
 * banned phrase in a `<meta name="description">` escaped the audit entirely.
 * That is not hypothetical: "why resizing beats any codec choice for saving
 * bytes" shipped in a meta description, an og:description, a twitter:description
 * and the JSON-LD, and every content check passed.
 *
 * Duplication is still measured on VISIBLE prose only — see `bodyText`. Folding
 * metadata into the shingles would change what that measurement means, and
 * every page's metadata legitimately echoes its own opening line.
 */
function claimText(page) {
  return claimSurface(page).all
}

function bodyText(page) {
  const main = page.dom.querySelector('main') ?? page.dom
  return main.innerHTML
    .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
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

  /*
   * ── Claims that were published and were false ─────────────────────────────
   *
   * Each of these shipped in the first draft of the content and was corrected
   * against a primary source. They are pinned here because they are exactly
   * the kind of confident, plausible sentence that gets written again by
   * someone who has not read docs/content-sources.md.
   *
   * This audit cannot decide whether a NEW claim is true — nothing automated
   * can. It can refuse to let a known-false one come back.
   */
  {
    pattern:
      /\b(?:only|sole) (?:common |widely[- ]used )?format\b[^.]{0,60}\b(?:alpha|transparen)/i,
    why: 'false exclusivity — AVIF also supports lossy compression with alpha (MDN)',
  },
  /*
   * The 8-bit pipeline. Measured against the app's shipping encoder calls with a
   * 16-bit source, every output reads back `depth: 'uchar'` — PNG, TIFF LZW,
   * lossless WebP and lossless AVIF alike. "Lossless" is therefore true of the
   * codec and false of the conversion, and /convert/heic-to-png shipped both
   * claims at once. See src/data/product.ts `limits.bitDepth`.
   */
  {
    pattern: /\bperfect copy\b/i,
    why: 'an 8-bit re-encode of a deeper source is not a perfect copy — limits.bitDepth',
  },
  {
    pattern: /adds no (?:new|further) (?:quality )?loss/i,
    why: 'quantisation to 8 bits IS a new loss — say what the conversion costs',
  },
  {
    pattern: /picks up no new compression artefacts/i,
    why: 'true of DEFLATE, false of the conversion — the depth drop is not an artefact claim',
  },
  {
    pattern: /\bpreserves? (?:the )?(?:full )?(?:10|12|14|16)[- ]bit\b/i,
    why: 'the pipeline writes 8-bit in every format — it preserves no higher depth',
  },
  {
    pattern: /\bhigher bit depth becomes available\b/i,
    why: 'it does not — PixelFerry encodes 8-bit AVIF and 8-bit HEIC',
  },
  /*
   * Citation integrity. The site attributed "26% smaller than PNG" to Google's
   * WebP Lossless and Alpha Study by name, in four places. That study reports
   * 23% against ZopfliPNG and 42% against libpng; the 26% headline is from the
   * WebP overview page. A figure and a named source that do not belong together
   * is a harder defect to catch than a wrong number, because both halves are
   * individually true.
   */
  {
    pattern: /Lossless and Alpha Study[^.]{0,80}\b26\s?%/i,
    why: 'that study reports 23% (vs ZopfliPNG) and 42% (vs libpng) — 26% is the overview page',
  },
  {
    pattern: /\b26\s?%[^.]{0,60}Lossless and Alpha Study/i,
    why: 'that study reports 23% (vs ZopfliPNG) and 42% (vs libpng) — 26% is the overview page',
  },
  {
    pattern: /\b(?:nothing else can|no other format can)\b/i,
    why: 'exclusivity claim — check it against MDN before writing it',
  },
  {
    pattern: /\bstrictly better\b|\bno downside\b|\b(?:genuinely |essentially )?free win\b/i,
    why: 'absolute superiority claim — Google documents cases where WebP is larger',
  },
  {
    pattern:
      /Adjust Size[^.]{0,40}\bone (?:image )?at a time\b|works on the \*\*frontmost image\*\*/i,
    why: 'false — Apple documents resizing a multi-selection with Tools → Adjust Size',
  },
  {
    pattern: /\balmost nothing outside Apple(?:’|')?s ecosystem\b/i,
    why: 'outdated — current Windows and many editors read HEIC',
  },
  {
    pattern:
      /\b(?:roughly |approximately )?equivalent to (?:JPEG|WebP|AVIF) \d{2}\b|\bJPEG at _?q \+ \d/i,
    why: 'quality scales are encoder-specific; there is no equivalence between them',
  },
  {
    pattern: /\bis invisible\b|\bvisually indistinguishable\b/i,
    why: 'absolute perceptual claim — say "hard to see at normal viewing size"',
  },

  /*
   * ── Second pass: product-truth claims that were published and were false ──
   *
   * Reconciled against the app's EXECUTABLE SOURCE at the commit pinned in
   * `src/data/product.ts`. See docs/content-sources.md for the evidence table.
   */
  {
    pattern: /\bno browsers? (?:displays?|supports?) HEIC\b|HEIC[^.]{0,30}\bno browser\b/i,
    why: 'false — WebKit shipped HEIC display in Safari 17.0',
  },
  {
    pattern: /\bbrowsers do not display (?:it|TIFF)\b/i,
    why: 'false — MDN: "Other than Safari, browsers do not natively support TIFF"',
  },
  {
    /*
     * `\bHEIC\b`, deliberately: "AVCI / HEICS" is a real read-only family and
     * must not trip this. Only `.heic` is written.
     */
    pattern: /\bHEIC\b[^.]{0,50}\b(?:input[- ]only|never writ|cannot be an output)/i,
    why: 'false — the app writes HEIC on macOS via encodeHeicViaSips',
  },
  {
    pattern: /\bICO\s*\/\s*ICNS\b/,
    why: 'ICO is writable and ICNS is not — do not group them as one capability',
  },
  {
    pattern: /\balmost certainly a JPEG\b|\bwas probably a JPEG\b/i,
    why: 'not knowable from a .webp file — do not infer the source format',
  },
  {
    pattern: /\bthat is\s+unavoidable\b/i,
    why: 'absolute — depends on both encoders and their settings',
  },
  {
    pattern: /\bno server in this product\b/i,
    why: 'the project operates an API — scope the claim to the desktop app',
  },
]

/**
 * A size percentage has to name where it came from.
 *
 * Checked over a window either side of the number rather than with a lookahead,
 * because the attribution reads naturally in both directions — "Google measures
 * WebP 25–34% smaller" and "25–34% smaller, in Google's study" are both fine.
 */
const ATTRIBUTION = /Google|study|studies|average|measured|corpus|benchmark|SSIM/i

for (const page of pages) {
  const text = claimText(page)
  for (const match of text.matchAll(/\b\d{1,2}\s?[–-]\s?\d{1,2}%\s+smaller\b/gi)) {
    const at = match.index ?? 0
    const window = text.slice(Math.max(0, at - 140), at + match[0].length + 140)
    report.check(
      ATTRIBUTION.test(window),
      `${page.rel}: "${match[0]}" has no source nearby — cite the study or drop the number`,
    )
  }
}

for (const page of pages) {
  // The FULL claim surface, head included — a false claim in a meta description
  // is published just as loudly as one in the body, and is often the only thing
  // a person reads before clicking.
  const text = claimText(page)
  for (const { pattern, why } of FORBIDDEN) {
    const match = text.match(pattern)
    report.check(!match, `${page.rel}: ${why} — "${match?.[0]}"`)
  }
}

// ── Words run together ────────────────────────────────────────────────────
//
// Astro 7 defaults to `compressHTML: 'jsx'`, which strips whitespace between
// an expression and adjacent text. That silently shipped "with 4files
// converting" and "Quality 1–100for JPG" on the homepage — invisible in the
// source, obvious on the page. The fix is an explicit `{' '}`; this catches
// the shape the omission leaves behind.
const CODE_WORDS = new Set([
  'compressionlevel',
  'formatoptions',
  'resamplewidth',
  'resampleheight',
  'resampleheightwidthmax',
  'base64',
  'utf8',
  'wcag',
  'jpeg2000',
])

for (const page of pages) {
  const text = bodyText(page)
  for (const match of text.matchAll(/\b(\w*?\d+[a-z]{3,}|[a-z]{3,}[A-Z][a-z]{3,})\b/g)) {
    const word = match[0]
    if (CODE_WORDS.has(word.toLowerCase())) continue
    if (/^\d+(px|s|ms|kb|mb|gb|x)$/i.test(word)) continue
    report.check(
      false,
      `${page.rel}: "${word}" reads as two words run together — an expression ` +
        `next to text needs an explicit {' '}`,
    )
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
