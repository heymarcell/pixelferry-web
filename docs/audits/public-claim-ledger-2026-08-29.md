# Public claim ledger — 2026-08-29

A claim-level forensic review of every factual assertion this site publishes.

**Web branch** `feat/astro7-seo-rebuild` · **app source of truth**
`heymarcell/pixelferry-app@f6bd954889fd1d21ba85153517f91b02addec147`

## Why this pass happened

`/convert/heic-to-png` shipped a self-contradiction. Its frontmatter said the
conversion "adds no new quality loss" and gives "a perfect copy"; forty lines
below, the same file said "PixelFerry writes 8-bit PNG. A 10-bit HEIC is
quantised on the way through."

Two prior review passes and every automated check went green over it. That is
the finding worth generalising: **each half is true in isolation.** No
single-sentence check can catch a contradiction whose halves are separated by a
frontmatter boundary, and no similarity or readability metric looks for one.

So this pass was not "re-run the audits". It was: extract every claim, name its
source, and rule on it.

## What this ledger does not prove

It does not prove the site is true. It records which claims were checked, against
what, and what was decided. Claims not listed here were not reviewed. A green
`npm run audit:content` still means only that no *known-false* phrasing is
present — the audit cannot decide whether a *new* sentence is true, and nothing
automated can.

Three consecutive reviews have each found confident, plausible, wrong statements
that all previous checks had passed. The correct prior is that a fourth would
find more.

## Verdicts used

| Verdict | Meaning |
| --- | --- |
| **TRUE** | Verified against executable source, a measurement, or a primary document |
| **FALSE** | Contradicted by the same. Fixed in this pass |
| **CONTRADICTORY** | Site asserted both a claim and its negation. Fixed |
| **MISATTRIBUTED** | Figure correct, named source does not contain it. Fixed |
| **OVERSTATED** | Directionally right, absolute as written. Scoped |
| **UNSOURCED** | No evidence found. Removed or generalised |

---

## 1. The systemic defect — the pipeline is 8-bit

Everything in this section is one defect class, found in six places.

### The measurement

Every encoder branch in the app's `applyFormat` is called without a `bitdepth`
option, so libvips writes 8 bits per channel whatever the source was. Measured
with sharp 0.35.3 / libvips 8.18.3, feeding a 16-bit `rgb16` source into the
exact shipping calls and reading the result back:

| Shipping call | `applyFormat` | Output depth |
| --- | --- | --- |
| `png({ compressionLevel: 9 })` | `pipeline.ts:145` | `uchar` — 8-bit |
| `tiff({ compression: 'lzw' })` | `pipeline.ts:160` | `uchar` — 8-bit |
| `webp({ lossless: true })` | `pipeline.ts:153` | `uchar` — 8-bit |
| `avif({ lossless: true })` | `pipeline.ts:157` | `uchar` — 8-bit |

On the macOS HEIC read path, `sips -s format tiff` genuinely produces a **16-bit**
intermediate (`depth: ushort`, `space: rgb16`) which the final encode drops to 8.
The precision loss is real and it happens at the encode step, so the file's own
bit-depth row was the accurate half and its "perfect copy" was the false one.

The app already enforces this rule on itself. `shared/settings.ts:99-108`:
HEIC and AVIF "used to advertise 'HDR'. They cannot deliver it… measured, a
16-bit source comes out `depth: 'uchar'`… The containers can carry HDR; this
pipeline never puts any in them."

### The claims

| # | Claim | Where | Verdict | Action |
| --- | --- | --- | --- | --- |
| 1.1 | "converting HEIC to PNG adds no new quality loss" | `heic-to-png` description | **CONTRADICTORY** | Replaced with the 8-bit statement |
| 1.2 | "picks up no new compression artefacts" | `heic-to-png` summary | **CONTRADICTORY** | Scoped to compression, not depth |
| 1.3 | "the conversion adds no further loss… a perfect copy of an imperfect image" | `heic-to-png` whatChanges | **FALSE** | Split into the 8-bit and 10-bit cases |
| 1.4 | "from the PNG onward, every save is exact" | `heic-to-png` body | **OVERSTATED** | Kept, with what the step itself costs |
| 1.5 | "the same pixel-exact guarantee" (WebP lossless) | `heic-to-png` body | **OVERSTATED** | Scoped to the 8-bit result |
| 1.6 | "12 million pixels × 3 bytes" | `heic-to-png` body | **FALSE** | Both decode paths yield 4 channels; the page already said the alpha channel exists |
| 1.7 | "Lossless WebP reproduces every pixel and every alpha value exactly" | `png-to-webp` | **OVERSTATED** | WebP has no 16-bit mode; scoped, and a limitation added |
| 1.8 | "Higher bit depth becomes available" (AVIF) | `jpg-to-avif` | **FALSE** | It does not become available — PixelFerry writes 8-bit AVIF |
| 1.9 | "Handles 10- and 12-bit and wide gamut natively" | `choosing-an-image-format` | **OVERSTATED** | Format headroom, not a product capability |
| 1.10 | "TIFF… lossless, 16-bit capable" | `choosing-an-image-format` | **OVERSTATED** | TIFF is a container and can hold JPEG data; PixelFerry writes 8-bit LZW |

**Guarded by** `test/pipeline-claims.test.ts` (5 tests) and five new
`audit:content` patterns. Both mutation-tested — see §6.

---

## 2. Citation integrity

| # | Claim | Where | Verdict | Action |
| --- | --- | --- | --- | --- |
| 2.1 | "Google's _WebP Lossless and Alpha Study_ puts the difference at 26% smaller on average" | `png-to-webp` ×4 | **MISATTRIBUTED** | That study reports **23% vs ZopfliPNG** and **42% vs libpng**. 26% is the WebP overview page. Both figures now given with their baselines |
| 2.2 | "Google measures WebP 25–34% smaller than JPEG at matched SSIM" | `jpg-to-webp`, `choosing-an-image-format` | **TRUE**, incomplete | Correct, but the study's baseline is **libjpeg 6b `-optimize`** while PixelFerry encodes with mozjpeg — so the gap against its own output is narrower. Now stated |
| 2.3 | "which PixelFerry measures at roughly seven times the speed" | homepage | **FALSE provenance** | No such measurement existed — the 7× came from a code comment and the app README. Measured here at **12.2×** (153 ms vs 1868 ms, 12 MP, median of 3). One synthetic run on one machine does not justify a precise public number, so the page now says "several times faster" and the measurement is recorded |
| 2.4 | "AVIF… 5x mozjpeg, 3x WebP on a 12 MP photograph" | `jpg-to-avif`, `choosing-an-image-format` | **TRUE**, overstated | Ratios reproduce, but the source was **synthetic**, one machine, one library version. Conditions restored |

Sources: `developers.google.com/speed/webp`,
`/speed/webp/docs/webp_study`, `/speed/webp/docs/webp_lossless_alpha_study`.

---

## 3. Product capability and defaults

Verified against `shared/settings.ts`, `main/pipeline.ts`, `main/decode.ts`,
`main/collectImages.ts` at `f6bd954`.

| # | Claim | Verdict | Evidence |
| --- | --- | --- | --- |
| 3.1 | "Optionally strip EXIF, XMP and IPTC" | **FALSE** | `DEFAULT_RECIPE.removeMetadata: true` — removal is ON. Contradicted the FAQ 130 lines below on the same page |
| 3.2 | "an interrupted batch leaves your source folder exactly as it was" | **FALSE** | `defaultSaveLocation: { type: 'input-folder' }` — output is written beside each source by default. Originals are untouched; the folder is not |
| 3.3 | "the encoder searches quality values until the output fits" | **OVERSTATED** | `TARGET_MAX_ITERATIONS = 8`; on failure it saves at minimum quality with a warning. Applies to JPEG/WebP/AVIF only |
| 3.4 | "picks up everything it can read" | **OVERSTATED** | Walk stops at 5,000 files and depth 10, skips dotfiles and symlinks |
| 3.5 | "HEIC and camera RAW decode through macOS system codecs, everything else through the bundled image pipeline" | **INCOMPLETE** | The whole macOS-only set goes through `sips`; PSD/PSB via `@webtoon/psd`, PDF via `pdf-to-png-converter` |
| 3.6 | "Windows and Linux targets… never been built, signed or tested" | **FALSE** on "tested" | Only a `mac` build target is declared, but win32/linux paths are unit-tested (`clipboardFile.test.ts:39-40`) |
| 3.7 | Crop/Fill produce the requested box | **INCOMPLETE** | `dontUpscale: true` by default — a smaller source keeps its own dimensions. Caveat added |
| 3.8 | "One decode, one write" | **OVERSTATED** | Target-size re-runs decode+resize up to 8×; HEIC writes an intermediate |
| 3.9 | HEIC read is available off macOS | **TRUE** | `heic-convert@^2.1.0` is a real dependency and the fallback in `decode.ts:189`. sharp's own build is AVIF-only for HEIF, so this was worth confirming |
| 3.10 | Output set, quality range, default 80, 100-page PDF cap, `_converted` suffix | **TRUE** | Unchanged from the previous pass; re-verified at the new pin |

---

## 4. macOS built-in capability

| # | Claim | Verdict | Evidence |
| --- | --- | --- | --- |
| 4.1 | "No WebP or AVIF output" from `sips` | **CONTRADICTORY** | `sips --formats` on macOS 26.5.1: `public.avif` **Writable**, `org.webmproject.webp` not. `/convert/jpg-to-avif` on this same site already said so. The AVIF half was false |
| 4.2 | "None of the built-ins output WebP or AVIF… that is the whole job" | **FALSE** | Same. It was one of three headline reasons the product exists |
| 4.3 | "Every built-in makes you sort by type first" | **FALSE** | Finder's Convert Image takes a mixed selection in one pass; the same guide says so |
| 4.4 | "sips is… the only one you can schedule" | **FALSE** | Shortcuts personal automations and Automator via Calendar/Folder Actions/`launchd` |
| 4.5 | "None of the built-ins report which specific file failed" | **OVERSTATED** | `sips` prints the offending path to stderr. Reworded to the real gap — no readable per-file summary |
| 4.6 | "PSD and PDF handling is inconsistent" (Preview) | **UNSOURCED** | Replaced with the WebP fact, which is measured |

---

## 5. Unsourced quantities

| # | Claim | Verdict | Action |
| --- | --- | --- | --- |
| 5.1 | "On a batch of eight hundred, a handful of files will be truncated or corrupt" | **UNSOURCED** | Invented failure rate. Rewritten conditionally |
| 5.2 | "ten to twenty times the size of an equivalent JPEG" (photographic PNG) | **UNSOURCED** | A previous pass removed "ten times"; it returned wider. Now "several times, depends heavily on the image" |
| 5.3 | "slow and unreliable above a couple of hundred files" / "twenty comfortably, eight hundred badly" | **UNSOURCED** | Thresholds removed, mechanism kept |
| 5.4 | "reliably the slowest to make" (AVIF) | **OVERSTATED** | AVIF encode time is dominated by the speed/effort setting. Scoped to PixelFerry's configuration |
| 5.5 | "WebP lossless beats PNG at that job" (takeaway) | **OVERSTATED** | Contradicted its own page, which notes Google documents WebP coming out larger |
| 5.6 | "Halving the dimensions quarters the pixel count, and the file size follows" | **FALSE** | Lossy size scales sub-linearly; headers and ICC do not scale |
| 5.7 | "Every piece of software written in the last thirty years reads it" | **UNSOURCED** | Unfalsifiable, and T.81 is 1992 — 34 years. Replaced with the date |
| 5.8 | "Lossy only. No transparency, 8-bit only" (JPEG) | **CONFLATED** | Scoped to baseline JPEG; the spec also defines 12-bit and lossless modes |

---

## 6. Guards added, and proof they work

A guard that cannot fail is worse than no guard, so each was mutation-tested by
reintroducing the defect and confirming the suite goes red.

| Mutation | Result |
| --- | --- |
| Re-add "perfect copy" to `heic-to-png` | caught |
| Re-add "adds no further loss" | caught |
| Strip the 8-bit scope from `png-to-webp` | caught |
| Delete "PixelFerry writes 8-bit PNG" | caught |
| Claim the pipeline preserves 16-bit | caught |
| Flip `limits.bitDepth.output` to 16 | caught |
| Revert the AVIF "higher bit depth" fix | caught |
| Strip the guide's 8-bit scope | caught |
| Re-attribute 26% to the named study (built HTML) | caught |
| Reintroduce "adds no further loss" in built HTML | caught |

`test/pipeline-claims.test.ts` — 5 tests. `scripts/audit-content.mjs` — 7 new
patterns, 543 → 683 checks.

## 7. Decoder reality — PSD and PDF

Three fresh-context reviewers ran against app source. These are the defects that
came from reading the decoders rather than the prose.

| # | Claim | Verdict | Evidence |
| --- | --- | --- | --- |
| 7.1 | "A multi-page PDF exports as `name.png`, `name-2.png`…" | **FALSE** | `main.ts:531` writes `` `${folderBase}-${i + 1}${ext}` `` for **every** page. Page one is `name-1.png`. A reader scripting against `name.png` gets a missing file |
| 7.2 | "The ICC profile rides along" (PSD→PNG) | **FALSE** | `decode.ts:218-221` builds the sharp pipeline from a **raw RGBA buffer**, which carries no profile, so `keepIccProfile()` has nothing to keep. `@webtoon/psd` exposes `psd.icc_profile`; the app never reads it |
| 7.3 | "CMYK documents are converted for screen" | **FALSE** | The composite is read positionally as RGBA and `psd.colorMode` is never consulted, so a CMYK PSD is misread (K lands in the alpha channel), not remapped |
| 7.4 | "A 16-bit… document loses precision" | **FALSE** | `@webtoon/psd` throws `Unsupported image bit depth` for non-8-bit. It fails; it does not lose precision |
| 7.5 | "a PSD saved without a compatibility composite will not convert" | **FALSE** | No such check exists — `psd.composite()` is called unconditionally. The realistic outcome is a wrong image reported as success |
| 7.6 | "pages… sort correctly in… anything that reads the directory" | **FALSE** | Numbers are not zero-padded, so `name-10.png` sorts before `name-2.png` in any lexicographic listing |
| 7.7 | "Rasterising a page at print resolution" ×2 | **FALSE** | `decode.ts:229, 272` hard-code `viewportScale: 2.0` — roughly 144 dpi, not configurable |
| 7.8 | "rendering happens… one page at a time" | **FALSE** | The app's own comment says every requested page is rendered into memory at once — which is the actual justification for the 100-page cap |
| 7.9 | "convert to TIFF and stay in a format that can carry the intent" | **FALSE** | PixelFerry's TIFF output is 8-bit RGB LZW with no CMYK path. The link also pointed at a TIFF→JPG page |
| 7.10 | "start around quality 55–65" vs "start at the app's default of 80" | **CONTRADICTORY** | Same page, ~1000 words apart. 55–65 was already on this project's removed-as-unsupported list and had come back |
| 7.11 | "compressed as a JPEG when it was uploaded… a third lossy generation" | **CONTRADICTORY** | The same page says "the file itself does not record which". A previously-removed "almost certainly a JPEG" had returned, strengthened to a flat assertion |
| 7.12 | "A WebP found on the web has already been through at least one lossy encode" | **FALSE** absolute | Lossless WebP is common for UI assets — the sibling page is about producing exactly that |
| 7.13 | "Turning on metadata removal drops EXIF…" | **FALSE** | `removeMetadata: true` in `DEFAULT_RECIPE`; `pipeline.ts:40` defaults it on |
| 7.14 | "only matters if you feed it a PNG" (white flatten) | **FALSE** | Flatten applies to every alpha-bearing source, HEIC included |
| 7.15 | "the Quick Action offers… one size setting" | **FALSE** | Four named presets |
| 7.16 | "WebP compresses alpha separately with its own predictors" | **WRONG MODE** | True of lossy WebP's `ALPH` chunk; in lossless VP8L alpha is in the same ARGB stream — and lossless is what the page is about |
| 7.17 | "cwebp -lossless… gives the same result" | **OVERSTATED** | Same pixels, different bytes — the two pass different effort settings to libwebp |
| 7.18 | "one 40-megapixel scan is 90 MB and another is 240 MB" | **UNSOURCED** | 240 MB is exactly the uncompressed size, so the example illustrated compressed-vs-uncompressed, not the LZW variance it claimed |

## 8. Legal — a retention promise nothing implements

This is the most serious finding in the pass, and it is not a wording problem.

`/privacy` published two dated retention commitments to data subjects:

> "Waitlist email and registration data: until you withdraw consent, or 24 months
> after our last waitlist or launch-related communication, whichever occurs first"
> "Unconfirmed registrations: normally deleted within 30 days"

Verified against the API source:

- **Nothing deletes `waitlist_signups`.** The Worker's scheduled handler runs
  `sweepBugReports`, `reconcileOrphanedScreenshots` and `pruneStaleActivations`;
  the only `DELETE FROM` statements in the whole API target `bug_reports` and
  `activations`. The single other reference to the table is one `INSERT`.
- **The 30-day promise is not merely unimplemented, it is unexecutable.**
  `waitlist_signups` has no confirmation-status column, so the controller's own
  record cannot distinguish a confirmed registration from an unconfirmed one.
  Confirmation status lives at the email provider.

| # | Claim | Verdict | Action |
| --- | --- | --- | --- |
| 8.1 | "24 months after our last… communication" | **FALSE** | No automated deletion exists. Replaced with what happens — kept as the consent record, deleted on request — and an explicit note that no retention schedule is set yet |
| 8.2 | "Unconfirmed registrations: normally deleted within 30 days" | **UNEXECUTABLE** | Removed. The schema cannot identify them |
| 8.3 | "Your consent status and confirmation status" | **FALSE** | Confirmation status is not in the controller's record. Replaced with the verbatim consent wording and timestamp, which is what is stored |
| 8.4 | "Technical information… which may include your IP address" | **MISLEADING** | The IP is never stored raw — only a salted, purpose-scoped one-way pseudonym. Reworded, which is both accurate and more favourable to the data subject |
| 8.5 | "the coming-soon website" | **STALE** | It is now a 20-URL site |

## 9. A finding that was withdrawn

One reviewer initially reported that the privacy policy failed to cover the
desktop app's update check, licence validation, beta safety check and bug-report
upload, and then **retracted it** after auditing the app source: at `f6bd954`
`apps/desktop/src/**` contains no network client at all. No updater, no licence
call, no telemetry, no crash reporter; `electron-updater` and Sentry appear in no
lockfile. The only `net.fetch` resolves a `file://` URL inside the app bundle.

The four network paths are described in the **app repo's own policy**, in the
present tense, for clients that have not been built. The server side exists and
is deployed; the desktop clients do not.

So `product.ts` — "Images are converted on your Mac. Nothing is uploaded." — is
**TRUE today**, and the site's silence about update and licence processing is
correct rather than an omission. It is recorded here because the opposite
conclusion was reached first, and because it will stop being true the moment an
updater ships.

What did survive from that thread: the site said the app's "test suite fails the
build if an outbound request path is added". The test greps for six specific call
patterns and would not catch Node `http`/`https`, `child_process`, `sendBeacon`,
an aliased call or a dependency. Scoped on the page and in `CLAUDE.md`.

## 10. What remains open

- The app README at `f6bd954:README.md:81` still calls HEIC input-only. Source
  and tests say otherwise. **Not fixed here** — that is the app repo's to change.
- Legal identity on `/privacy` and `/cookies` is still placeholder, behind a
  DRAFT badge. Unresolvable without the controller's real details.
- The claims in §2 rest on published third-party studies. They were read at the
  URLs given; they can be revised by their publishers.
- **A retention period for waitlist data must be set and implemented.** The
  policy now says no schedule exists, which is true but is not a resting state.
  Either a sweep is added to the API or the period is defined and honoured.
- The processors are **determinable from source** — the email provider appears in
  `apps/api/src/lib/brevo.ts` and the platform in `wrangler.jsonc` and
  `public/_headers` — but the policy still shows `[PROVIDER NAME AND COUNTRY]`.
  Left as a placeholder deliberately: naming processors carries DPA and transfer
  obligations that are counsel's call, not an agent's. Flagged so the gap is not
  mistaken for "unknown".
- §6 International transfers hedges with "some providers **may** process… outside
  the EEA" when the actual set is determinable. Same reason, same owner.
