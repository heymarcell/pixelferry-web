import broken from '../assets/thumbs/broken.webp'
import heic from '../assets/thumbs/heic.webp'
import psd from '../assets/thumbs/psd.webp'
import raw from '../assets/thumbs/raw.webp'
import tiff from '../assets/thumbs/tiff.webp'
import webp from '../assets/thumbs/webp.webp'

export type RowStatus = 'complete' | 'converting' | 'ready' | 'error'

export type QueueRow = {
  id: string
  name: string
  meta: string
  thumb: string
  status: RowStatus
}

/** The exact queue staged in the Pencil design's app preview. */
export const queue: QueueRow[] = [
  {
    id: 'heic',
    name: 'iphone-shoot.heic',
    meta: '2.4 MB → 340 KB (−86%)',
    thumb: heic,
    status: 'complete',
  },
  {
    id: 'raw',
    name: 'studio-camera.cr3',
    meta: '2.4 MB → 340 KB (−86%)',
    thumb: raw,
    status: 'complete',
  },
  {
    id: 'psd',
    name: 'campaign-master.psd',
    meta: '3.2 / 5.1 MB · ~4s left',
    thumb: psd,
    status: 'converting',
  },
  {
    id: 'tiff',
    name: 'print-archive.tiff',
    meta: '2.4 MB • Ready',
    thumb: tiff,
    status: 'ready',
  },
  {
    id: 'webp',
    name: 'website-hero.webp',
    meta: '2.4 MB • Ready',
    thumb: webp,
    status: 'ready',
  },
  {
    id: 'broken',
    name: 'damaged-source.raw',
    meta: 'Decode failed · Retry available',
    thumb: broken,
    status: 'error',
  },
]

export const summary = {
  files: '24 files',
  done: '18 done',
  converting: '2 converting',
  ready: '4 ready',
  total: '86.4 MB total',
}
