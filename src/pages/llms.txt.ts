import type { APIRoute } from 'astro'
import { getCollection } from 'astro:content'
import { site, absoluteUrl } from '../data/site'
import {
  product,
  limits,
  capabilities,
  psdSupport,
  formats,
  outputFormats,
  readOnlyFormats,
  macOSOnlyWriteFormats,
  formatCounts,
  capabilityOf,
} from '../data/product'

/**
 * `llms.txt`, GENERATED from the same product model the pages render.
 *
 * It used to be a hand-maintained copy in `public/`, and it drifted exactly the
 * way a hand-maintained copy does: it said HEIC was "read but never written"
 * while the app had been writing HEIC all along. Deriving it means the format
 * list here cannot disagree with `/formats` — `test/format-model.test.ts`
 * asserts that too.
 *
 * On what this file is FOR: it is published for interoperability, not ranking.
 * Google's Search team has said Search does not use llms.txt, and no major model
 * provider has committed to reading it. It costs under two kilobytes and no
 * runtime. That is the whole justification — see docs/seo.md.
 */
export const prerender = true

const exts = (ids: string[]) =>
  formats
    .filter((f) => ids.includes(f.id))
    .flatMap((f) => f.extensions)
    .map((e) => e.toUpperCase())
    .join(', ')

export const GET: APIRoute = async () => {
  const conversions = (await getCollection('conversions')).sort((a, b) => a.id.localeCompare(b.id))
  const guides = (await getCollection('guides')).sort((a, b) => a.id.localeCompare(b.id))

  const body = `# ${product.name}

> ${site.shortDescription} Currently a private beta with a waitlist; there is no
> public download and no price.

This file is published for interoperability, not for ranking. Google's Search
team has stated that Search does not use llms.txt, and no major model provider
has committed to reading it. It exists because it is a cheap, accurate map of a
small site. Every page below is plain server-rendered HTML that needs no
JavaScript to read, so crawling the HTML directly works just as well.

## Facts

- Platform: ${product.minimumOS.label}, on ${product.architectures}.
- Reads ${formatCounts.readable} format families covering ${formatCounts.extensions} file
  extensions; writes ${formatCounts.writable}.
- Writes, in the order the app offers them: ${outputFormats.map((f) => f.label).join(', ')}.
  Writing ${macOSOnlyWriteFormats.map((f) => f.label).join(', ')} is macOS-only — that encode
  goes through the system \`sips\` tool. Everything else writes wherever the app runs.
- Quality slider (1–100) on: ${formats
    .filter((f) => f.write !== false && f.quality)
    .map((f) => f.label)
    .join(', ')}. PNG has no quality control, and PixelFerry writes TIFF with lossless
  LZW compression. Those two are lossless CODECS, which is not the same as a lossless
  conversion: all output is 8-bit per channel, so a source with more tonal precision is
  quantised on the way through. GIF is not in that group at all — it reduces the image to
  a 256-colour palette.
- Read but never written: ${readOnlyFormats.map((f) => f.label).join(', ')}.
- Reading these needs macOS (they decode via ImageIO): ${exts([
    'raw',
    'exr-hdr',
    'bmp-tga',
    'ico',
    'icns-cur',
    'gpu-textures',
    'jxl',
    'jp2',
    'netpbm',
    'dicom',
    'pict',
    'mpo',
    'avci-heics',
  ])}.
- ICO is the one format whose read and write differ in opposite directions:
  reading it needs macOS, writing it works anywhere.
- Multi-page PDFs export one image per page into a folder named after the
  document; a single-page PDF is written as one plain file. Capped
  at the first ${limits.pdfPageCap} pages.
- ${psdSupport.compositeNote}
- JPEG output flattens transparency onto white.
- ${capabilities.neverOverwrites}
- ${capabilities.metadata}
- ${capabilities.metadataHeicCaveat}
- Built with Electron, React and Sharp. It is native-feeling and uses macOS
  system codecs, but it is not a Cocoa application.

## Format matrix

${formats.map((f) => `- ${f.label} (${f.extensions.map((e) => `.${e}`).join(' ')}): ${capabilityOf(f)}.`).join('\n')}

## Product

- [Home](${absoluteUrl('/')}): what it does, how it works, and the waitlist.
- [Supported formats](${absoluteUrl('/formats')}): the complete read/write matrix
  and the exact limitations.

## Conversions

- [Conversion index](${absoluteUrl('/convert')})
${conversions.map((c) => `- [${c.data.from} to ${c.data.to}](${absoluteUrl(`/convert/${c.id}`)})`).join('\n')}

## Guides

- [Guide index](${absoluteUrl('/guides')})
${guides.map((g) => `- [${g.data.heading}](${absoluteUrl(`/guides/${g.id}`)})`).join('\n')}

## Legal

- [Privacy Policy](${absoluteUrl('/privacy')}) — draft, pending legal review
- [Cookie Policy](${absoluteUrl('/cookies')}) — draft, pending legal review
`

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
