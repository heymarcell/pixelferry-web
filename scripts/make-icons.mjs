#!/usr/bin/env node
/**
 * Generate the raster favicon set from `public/favicon.svg`.
 *
 * Google Search will not use an SVG-only favicon: it wants a square raster
 * icon of at least 48×48 at a stable URL. The previous site shipped only the
 * SVG, so it had no favicon eligibility at all.
 *
 * Run with `node scripts/make-icons.mjs`. Committed output, so the build has
 * no image-generation step and no sharp dependency at deploy time.
 */
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import sharp from 'sharp'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const svg = await readFile(path.join(root, 'public/favicon.svg'))

/** Render the mark at one size, on its own opaque brand tile. */
const render = (size) =>
  sharp(svg, { density: 384 }).resize(size, size).png({ compressionLevel: 9 })

// 96px: comfortably over Google's 48×48 floor while staying tiny.
await render(96).toFile(path.join(root, 'public/favicon-96.png'))
/*
 * 180px for iOS. Flattened onto the brand tile: the mark's rounded corners are
 * transparent, and iOS composites an apple-touch-icon onto BLACK rather than
 * onto the page, so an RGBA source renders with black corner wedges.
 */
await render(180)
  .flatten({ background: '#315CF4' })
  .toFile(path.join(root, 'public/apple-touch-icon.png'))

/**
 * A real .ico containing a single 32×32 image.
 *
 * Written by hand because sharp has no ICO encoder. The format is a 6-byte
 * ICONDIR, one 16-byte ICONDIRENTRY, then the payload — and a PNG payload is
 * legal in ICO since Vista, which every browser that still asks for
 * `/favicon.ico` supports.
 */
const png32 = await render(32).toBuffer()
const header = Buffer.alloc(6)
header.writeUInt16LE(0, 0) // reserved
header.writeUInt16LE(1, 2) // type: 1 = icon
header.writeUInt16LE(1, 4) // one image

const entry = Buffer.alloc(16)
entry.writeUInt8(32, 0) // width
entry.writeUInt8(32, 1) // height
entry.writeUInt8(0, 2) // palette size (0 = no palette)
entry.writeUInt8(0, 3) // reserved
entry.writeUInt16LE(1, 4) // colour planes
entry.writeUInt16LE(32, 6) // bits per pixel
entry.writeUInt32LE(png32.length, 8) // payload size
entry.writeUInt32LE(header.length + entry.length, 12) // payload offset

await writeFile(path.join(root, 'public/favicon.ico'), Buffer.concat([header, entry, png32]))

console.log('icons: favicon.ico (32), favicon-96.png, apple-touch-icon.png (180)')
