import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import { writableFormats, readOnlyFormats, macOSOnlyWriteFormats } from '../src/data/formats'

const DIST = path.join(path.dirname(import.meta.dirname), 'dist')

/**
 * Every public surface that lists formats must agree with the shared model.
 *
 * These read the BUILT output, not the source that was meant to produce it —
 * the previous failure was a hand-maintained `llms.txt` in `public/` quietly
 * disagreeing with the pages beside it, and nothing was looking.
 */
describe('format surfaces agree with the model', () => {
  let llms: string
  let formatsPage: string
  let home: string

  beforeAll(async () => {
    await readdir(DIST).catch(() => {
      throw new Error('dist/ is missing — run `npm run build` before `npm test`')
    })
    llms = await readFile(path.join(DIST, 'llms.txt'), 'utf8')
    formatsPage = await readFile(path.join(DIST, 'formats.html'), 'utf8')
    home = await readFile(path.join(DIST, 'index.html'), 'utf8')
  })

  it('llms.txt is generated, not a stale static copy', () => {
    // The generated route emits the whole matrix; the old hand-written file
    // never did.
    expect(llms).toContain('## Format matrix')
    for (const format of writableFormats) {
      expect(llms, `llms.txt should list ${format.label} as writable`).toContain(format.label)
    }
  })

  it('llms.txt names HEIC as writable on macOS', () => {
    expect(llms).toMatch(/HEIC \/ HEIF[^\n]*read and write on macOS/)
    expect(llms).not.toMatch(/HEIC[^\n]{0,40}read but never written/)
  })

  it('llms.txt does not call HEIC read-only', () => {
    const readOnlyLine = llms.split('\n').find((l) => l.includes('Read but never written'))
    expect(readOnlyLine).toBeTruthy()
    // \bHEIC\b, not a substring test: "AVCI / HEICS" legitimately belongs on
    // that line — HEIF image sequences are read-only. Only `.heic` is written.
    expect(readOnlyLine).not.toMatch(/\bHEIC\b/)
    expect(readOnlyLine).toContain('HEICS')
  })

  it('llms.txt lists exactly the model read-only set', () => {
    const line = llms.split('\n').find((l) => l.includes('Read but never written'))!
    for (const format of readOnlyFormats) {
      expect(line, `${format.label} missing from llms.txt read-only list`).toContain(format.label)
    }
  })

  it('/formats shows HEIC as writable on macOS', () => {
    const text = formatsPage.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
    expect(text).toMatch(/HEIC \/ HEIF/)
    // The writable-formats card grid must include it, flagged macOS only.
    expect(text).toMatch(/HEIC \/ HEIF\s+macOS only/)
  })

  it('/formats never presents ICO and ICNS as one capability', () => {
    const text = formatsPage.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
    expect(text).not.toMatch(/ICO\s*\/\s*ICNS/)
  })

  it('the homepage FAQ agrees with the output capabilities', () => {
    const text = home.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
    for (const format of writableFormats) {
      expect(text, `FAQ should name ${format.label} as an output`).toContain(format.label)
    }
    expect(text).toMatch(/Writing HEIC \/ HEIF needs macOS/)
  })

  it('the homepage never says HEIC cannot be written', () => {
    const text = home.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
    expect(text).not.toMatch(/\bHEIC\b[^.]{0,40}(?:input[- ]only|never written)/i)
  })

  it('the JSON-LD feature list names the real output set', () => {
    const block = home.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)?.[1]
    const data = JSON.parse(block!) as Record<string, unknown>[]
    const app = data.find((n) => n['@type'] === 'SoftwareApplication')!
    const features = (app.featureList as string[]).join(' ')
    expect(features).toContain('HEIC')
    expect(features).toMatch(/HEIC[^"]*requires macOS/)
  })

  it('exactly one format family is macOS-only to write', () => {
    // If a second one is ever added, every surface above needs revisiting.
    expect(macOSOnlyWriteFormats.map((f) => f.label)).toEqual(['HEIC / HEIF'])
  })

  it('no public surface still claims HEIC is input-only', async () => {
    const files = await readdir(DIST, { recursive: true, withFileTypes: true })
    const targets = files
      .filter((e) => e.isFile() && /\.(html|txt|xml)$/.test(e.name))
      .map((e) => path.join(e.parentPath ?? DIST, e.name))

    const offenders: string[] = []
    for (const file of targets) {
      const raw = await readFile(file, 'utf8')
      const text = raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
      if (/\bHEIC\b[^.]{0,50}(?:input[- ]only|never writ)/i.test(text)) {
        offenders.push(path.relative(DIST, file))
      }
      if (/no browsers? displays? HEIC/i.test(text)) {
        offenders.push(`${path.relative(DIST, file)} (browser claim)`)
      }
    }
    expect(offenders).toEqual([])
  })
})
