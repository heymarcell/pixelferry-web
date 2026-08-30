/**
 * The exact queue staged in the Pencil design's app preview.
 *
 * This is a *rendering of the product UI*, not a screenshot, and it is labelled
 * as one in the markup — every row here corresponds to behaviour the app really
 * has (see src/data/product.ts): mixed formats in one queue, per-row status, the
 * PSD flatten, and a decode failure that offers a retry.
 *
 * THE FIGURES ARE ILLUSTRATIVE AND SAY SO ON THE PAGE. They are not benchmark
 * results and must never be cited as any. Two rows previously showed a
 * byte-identical "2.4 MB -> 340 KB (-86%)" for a HEIC and a CR3, which is not a
 * plausible pair and put an unattributed compression percentage on the homepage
 * — the exact class docs/content-sources.md bars. Keep them plausible, keep
 * them distinct, and keep the caption.
 *
 * A converting row must not show a byte count or an ETA either: the app renders
 * an INDETERMINATE bar per row, and the only estimate is the batch-level one in
 * the summary bar. A mock showing "3.2 / 5.1 MB · ~4s left" advertised a
 * per-file progress feature that does not exist.
 */
export type RowStatus = 'complete' | 'converting' | 'ready' | 'error'

export type QueueRow = {
  id: string
  name: string
  meta: string
  /** Imported eagerly so Astro's asset pipeline emits optimised, hashed files. */
  thumb: ImageMetadata
  status: RowStatus
}

import broken from '../assets/thumbs/broken.webp'
import heic from '../assets/thumbs/heic.webp'
import psd from '../assets/thumbs/psd.webp'
import raw from '../assets/thumbs/raw.webp'
import tiff from '../assets/thumbs/tiff.webp'
import webp from '../assets/thumbs/webp.webp'

export const queue: QueueRow[] = [
  {
    id: 'heic',
    name: 'iphone-shoot.heic',
    meta: '2.4 MB → 612 KB (−75%)',
    thumb: heic,
    status: 'complete',
  },
  {
    id: 'raw',
    name: 'studio-camera.cr3',
    meta: '28.4 MB → 1.9 MB (−93%)',
    thumb: raw,
    status: 'complete',
  },
  {
    id: 'psd',
    name: 'campaign-master.psd',
    meta: '5.1 MB · Converting',
    thumb: psd,
    status: 'converting',
  },
  { id: 'tiff', name: 'print-archive.tiff', meta: '2.4 MB • Ready', thumb: tiff, status: 'ready' },
  { id: 'webp', name: 'website-hero.webp', meta: '2.4 MB • Ready', thumb: webp, status: 'ready' },
  {
    id: 'broken',
    name: 'damaged-source.raw',
    meta: 'Decode failed · Retry available',
    thumb: broken,
    status: 'error',
  },
]

/**
 * The simulated batch, as NUMBERS.
 *
 * The strings below and the preview's accessible description are all derived
 * from these. They used to be hand-written, and drifted: the summary bar said
 * "24 files · 18 done · 2 converting · 4 ready" while the accessible label
 * added "and one failed file", describing 25 files to a screen-reader user and
 * 24 to everyone else.
 *
 * `total` is DERIVED, so the parts can never disagree with the whole again.
 */
export const counts = {
  done: 17,
  converting: 2,
  ready: 4,
  failed: 1,
} as const

export const totalFiles = counts.done + counts.converting + counts.ready + counts.failed

export const summary = {
  files: `${totalFiles} files`,
  done: `${counts.done} done`,
  converting: `${counts.converting} converting`,
  ready: `${counts.ready} ready`,
  total: '86.4 MB total',
}

/**
 * The one description assistive tech gets for the whole preview. Built from the
 * same counts the visible summary bar renders, so the two cannot contradict.
 */
export const previewLabel =
  `The PixelFerry window: a queue of ${totalFiles} mixed image files — HEIC, CR3 RAW, PSD, TIFF ` +
  `and WebP — converting to PNG, with ${counts.done} done, ${counts.converting} converting, ` +
  `${counts.ready} ready and ${counts.failed} failed file offering a retry.`
