# Public claim ledger — 2026-08-29

A claim-level forensic review of every factual assertion this site publishes.

**Web branch** `feat/astro7-seo-rebuild`

## The app refs this ledger talks about

Resolved from `origin`, not from a local checkout.

| Ref                                          | SHA                                        | Status                         |
| -------------------------------------------- | ------------------------------------------ | ------------------------------ |
| App `origin/main` **now**                    | `f107ef72836c422f000e31a1100b129d23a53f8d` | released — PR #70 merge commit |
| App PR #70 — `fix/conversion-pipeline-truth` | merged as above; final head `5e0d58a`      | **MERGED**                     |

### The pin history, because it is the finding

This project got the cross-repo pin wrong three times, each differently:

1. A pass pinned `f6bd954` and `1627350` as app main. They were **pre-rebase
   commits on a locally checked-out feature branch**, existing on no remote. It
   had read the local checkout instead of `origin/main`.
2. A later pass correctly identified those commits as belonging to **open** PR
   #70 and pinned the PR head `048a5a4` as a pending candidate — but several
   documents still described the commits as merged.
3. That candidate head then **moved to `5e0d58a`** before merging, adding two
   further commits. So even a correctly-identified candidate SHA was not what
   shipped.

The pin is now the merged main, and the behaviour was verified **on the merge
result** rather than assumed from the PR: the HEIC metadata/ICC policy, the
shared `processAndWriteImage` path, and `e2e/pipeline-parity.spec.ts` are all
present, the README no longer calls HEIC input-only, and the format matrix is
byte-identical to the snapshot in `test/format-model.test.ts`.

`test/upstream-dependency.test.ts` now enforces the invariant in both directions
— a candidate pin cannot be presented as released, and a released pin cannot be
left flagged pending. It caught this very table.

Sections below marked **historical** record what was believed at the time.

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

It does not prove the site is true. It records which claims were checked,
against what, and what was decided. Claims not listed here were not reviewed. A
green `npm run audit:content` still means only that no _known-false_ phrasing is
present — the audit cannot decide whether a _new_ sentence is true, and nothing
automated can.

Three consecutive reviews have each found confident, plausible, wrong statements
that all previous checks had passed. The correct prior is that a fourth would
find more.

## Verdicts used

| Verdict           | Meaning                                                                  |
| ----------------- | ------------------------------------------------------------------------ |
| **TRUE**          | Verified against executable source, a measurement, or a primary document |
| **FALSE**         | Contradicted by the same. Fixed in this pass                             |
| **CONTRADICTORY** | Site asserted both a claim and its negation. Fixed                       |
| **MISATTRIBUTED** | Figure correct, named source does not contain it. Fixed                  |
| **OVERSTATED**    | Directionally right, absolute as written. Scoped                         |
| **UNSOURCED**     | No evidence found. Removed or generalised                                |

---

## 1. The systemic defect — the pipeline is 8-bit

Everything in this section is one defect class, found in six places.

### The measurement

Every encoder branch in the app's `applyFormat` is called without a `bitdepth`
option, so libvips writes 8 bits per channel whatever the source was. Measured
with sharp 0.35.3 / libvips 8.18.3, feeding a 16-bit `rgb16` source into the
exact shipping calls and reading the result back:

| Shipping call                  | `applyFormat`     | Output depth    |
| ------------------------------ | ----------------- | --------------- |
| `png({ compressionLevel: 9 })` | `pipeline.ts:145` | `uchar` — 8-bit |
| `tiff({ compression: 'lzw' })` | `pipeline.ts:160` | `uchar` — 8-bit |
| `webp({ lossless: true })`     | `pipeline.ts:153` | `uchar` — 8-bit |
| `avif({ lossless: true })`     | `pipeline.ts:157` | `uchar` — 8-bit |

On the macOS HEIC read path, `sips -s format tiff` genuinely produces a
**16-bit** intermediate (`depth: ushort`, `space: rgb16`) which the final encode
drops to 8. The precision loss is real and it happens at the encode step, so the
file's own bit-depth row was the accurate half and its "perfect copy" was the
false one.

The app already enforces this rule on itself. `shared/settings.ts:99-108`: HEIC
and AVIF "used to advertise 'HDR'. They cannot deliver it… measured, a 16-bit
source comes out `depth: 'uchar'`… The containers can carry HDR; this pipeline
never puts any in them."

### The claims

| #    | Claim                                                                       | Where                      | Verdict           | Action                                                                             |
| ---- | --------------------------------------------------------------------------- | -------------------------- | ----------------- | ---------------------------------------------------------------------------------- |
| 1.1  | "converting HEIC to PNG adds no new quality loss"                           | `heic-to-png` description  | **CONTRADICTORY** | Replaced with the 8-bit statement                                                  |
| 1.2  | "picks up no new compression artefacts"                                     | `heic-to-png` summary      | **CONTRADICTORY** | Scoped to compression, not depth                                                   |
| 1.3  | "the conversion adds no further loss… a perfect copy of an imperfect image" | `heic-to-png` whatChanges  | **FALSE**         | Split into the 8-bit and 10-bit cases                                              |
| 1.4  | "from the PNG onward, every save is exact"                                  | `heic-to-png` body         | **OVERSTATED**    | Kept, with what the step itself costs                                              |
| 1.5  | "the same pixel-exact guarantee" (WebP lossless)                            | `heic-to-png` body         | **OVERSTATED**    | Scoped to the 8-bit result                                                         |
| 1.6  | "12 million pixels × 3 bytes"                                               | `heic-to-png` body         | **FALSE**         | Both decode paths yield 4 channels; the page already said the alpha channel exists |
| 1.7  | "Lossless WebP reproduces every pixel and every alpha value exactly"        | `png-to-webp`              | **OVERSTATED**    | WebP has no 16-bit mode; scoped, and a limitation added                            |
| 1.8  | "Higher bit depth becomes available" (AVIF)                                 | `jpg-to-avif`              | **FALSE**         | It does not become available — PixelFerry writes 8-bit AVIF                        |
| 1.9  | "Handles 10- and 12-bit and wide gamut natively"                            | `choosing-an-image-format` | **OVERSTATED**    | Format headroom, not a product capability                                          |
| 1.10 | "TIFF… lossless, 16-bit capable"                                            | `choosing-an-image-format` | **OVERSTATED**    | TIFF is a container and can hold JPEG data; PixelFerry writes 8-bit LZW            |

**Guarded by** `test/pipeline-claims.test.ts` (5 tests) and five new
`audit:content` patterns. Both mutation-tested — see §6.

---

## 2. Citation integrity

| #   | Claim                                                                                    | Where                                     | Verdict              | Action                                                                                                                                                                                                                                                                                                       |
| --- | ---------------------------------------------------------------------------------------- | ----------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2.1 | "Google's _WebP Lossless and Alpha Study_ puts the difference at 26% smaller on average" | `png-to-webp` ×4                          | **MISATTRIBUTED**    | That study reports **23% vs ZopfliPNG** and **42% vs libpng**. 26% is the WebP overview page. Both figures now given with their baselines                                                                                                                                                                    |
| 2.2 | "Google measures WebP 25–34% smaller than JPEG at matched SSIM"                          | `jpg-to-webp`, `choosing-an-image-format` | **TRUE**, incomplete | Correct, but the study's baseline is **libjpeg 6b `-optimize`** while PixelFerry encodes with mozjpeg — so the gap against its own output is narrower. Now stated                                                                                                                                            |
| 2.3 | "which PixelFerry measures at roughly seven times the speed"                             | homepage                                  | **FALSE provenance** | No such measurement existed — the 7× came from a code comment and the app README. Measured here at **12.2×** (153 ms vs 1868 ms, 12 MP, median of 3). One synthetic run on one machine does not justify a precise public number, so the page now says "several times faster" and the measurement is recorded |
| 2.4 | "AVIF… 5x mozjpeg, 3x WebP on a 12 MP photograph"                                        | `jpg-to-avif`, `choosing-an-image-format` | **TRUE**, overstated | Ratios reproduce, but the source was **synthetic**, one machine, one library version. Conditions restored                                                                                                                                                                                                    |

Sources: `developers.google.com/speed/webp`, `/speed/webp/docs/webp_study`,
`/speed/webp/docs/webp_lossless_alpha_study`.

---

## 3. Product capability and defaults

Verified against `shared/settings.ts`, `main/pipeline.ts`, `main/decode.ts`,
`main/collectImages.ts` at `f6bd954`.

| #    | Claim                                                                                                        | Verdict               | Evidence                                                                                                                                              |
| ---- | ------------------------------------------------------------------------------------------------------------ | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3.1  | "Optionally strip EXIF, XMP and IPTC"                                                                        | **FALSE**             | `DEFAULT_RECIPE.removeMetadata: true` — removal is ON. Contradicted the FAQ 130 lines below on the same page                                          |
| 3.2  | "an interrupted batch leaves your source folder exactly as it was"                                           | **FALSE**             | `defaultSaveLocation: { type: 'input-folder' }` — output is written beside each source by default. Originals are untouched; the folder is not         |
| 3.3  | "the encoder searches quality values until the output fits"                                                  | **OVERSTATED**        | `TARGET_MAX_ITERATIONS = 8`; on failure it saves at minimum quality with a warning. Applies to JPEG/WebP/AVIF only                                    |
| 3.4  | "picks up everything it can read"                                                                            | **OVERSTATED**        | Walk stops at 5,000 files and depth 10, skips dotfiles and symlinks                                                                                   |
| 3.5  | "HEIC and camera RAW decode through macOS system codecs, everything else through the bundled image pipeline" | **INCOMPLETE**        | The whole macOS-only set goes through `sips`; PSD/PSB via `@webtoon/psd`, PDF via `pdf-to-png-converter`                                              |
| 3.6  | "Windows and Linux targets… never been built, signed or tested"                                              | **FALSE** on "tested" | Only a `mac` build target is declared, but win32/linux paths are unit-tested (`clipboardFile.test.ts:39-40`)                                          |
| 3.7  | Crop/Fill produce the requested box                                                                          | **INCOMPLETE**        | `dontUpscale: true` by default — a smaller source keeps its own dimensions. Caveat added                                                              |
| 3.8  | "One decode, one write"                                                                                      | **OVERSTATED**        | Target-size re-runs decode+resize up to 8×; HEIC writes an intermediate                                                                               |
| 3.9  | HEIC read is available off macOS                                                                             | **TRUE**              | `heic-convert@^2.1.0` is a real dependency and the fallback in `decode.ts:189`. sharp's own build is AVIF-only for HEIF, so this was worth confirming |
| 3.10 | Output set, quality range, default 80, 100-page PDF cap, `_converted` suffix                                 | **TRUE**              | Unchanged from the previous pass; re-verified at the new pin                                                                                          |

---

## 4. macOS built-in capability

| #   | Claim                                                              | Verdict           | Evidence                                                                                                                                                                    |
| --- | ------------------------------------------------------------------ | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 4.1 | "No WebP or AVIF output" from `sips`                               | **CONTRADICTORY** | `sips --formats` on macOS 26.5.1: `public.avif` **Writable**, `org.webmproject.webp` not. `/convert/jpg-to-avif` on this same site already said so. The AVIF half was false |
| 4.2 | "None of the built-ins output WebP or AVIF… that is the whole job" | **FALSE**         | Same. It was one of three headline reasons the product exists                                                                                                               |
| 4.3 | "Every built-in makes you sort by type first"                      | **FALSE**         | Finder's Convert Image takes a mixed selection in one pass; the same guide says so                                                                                          |
| 4.4 | "sips is… the only one you can schedule"                           | **FALSE**         | Shortcuts personal automations and Automator via Calendar/Folder Actions/`launchd`                                                                                          |
| 4.5 | "None of the built-ins report which specific file failed"          | **OVERSTATED**    | `sips` prints the offending path to stderr. Reworded to the real gap — no readable per-file summary                                                                         |
| 4.6 | "PSD and PDF handling is inconsistent" (Preview)                   | **UNSOURCED**     | Replaced with the WebP fact, which is measured                                                                                                                              |

---

## 5. Unsourced quantities

| #   | Claim                                                                                             | Verdict        | Action                                                                                                    |
| --- | ------------------------------------------------------------------------------------------------- | -------------- | --------------------------------------------------------------------------------------------------------- |
| 5.1 | "On a batch of eight hundred, a handful of files will be truncated or corrupt"                    | **UNSOURCED**  | Invented failure rate. Rewritten conditionally                                                            |
| 5.2 | "ten to twenty times the size of an equivalent JPEG" (photographic PNG)                           | **UNSOURCED**  | A previous pass removed "ten times"; it returned wider. Now "several times, depends heavily on the image" |
| 5.3 | "slow and unreliable above a couple of hundred files" / "twenty comfortably, eight hundred badly" | **UNSOURCED**  | Thresholds removed, mechanism kept                                                                        |
| 5.4 | "reliably the slowest to make" (AVIF)                                                             | **OVERSTATED** | AVIF encode time is dominated by the speed/effort setting. Scoped to PixelFerry's configuration           |
| 5.5 | "WebP lossless beats PNG at that job" (takeaway)                                                  | **OVERSTATED** | Contradicted its own page, which notes Google documents WebP coming out larger                            |
| 5.6 | "Halving the dimensions quarters the pixel count, and the file size follows"                      | **FALSE**      | Lossy size scales sub-linearly; headers and ICC do not scale                                              |
| 5.7 | "Every piece of software written in the last thirty years reads it"                               | **UNSOURCED**  | Unfalsifiable, and T.81 is 1992 — 34 years. Replaced with the date                                        |
| 5.8 | "Lossy only. No transparency, 8-bit only" (JPEG)                                                  | **CONFLATED**  | Scoped to baseline JPEG; the spec also defines 12-bit and lossless modes                                  |

---

## 6. Guards added, and proof they work

A guard that cannot fail is worse than no guard, so each was mutation-tested by
reintroducing the defect and confirming the suite goes red.

| Mutation                                         | Result |
| ------------------------------------------------ | ------ |
| Re-add "perfect copy" to `heic-to-png`           | caught |
| Re-add "adds no further loss"                    | caught |
| Strip the 8-bit scope from `png-to-webp`         | caught |
| Delete "PixelFerry writes 8-bit PNG"             | caught |
| Claim the pipeline preserves 16-bit              | caught |
| Flip `limits.bitDepth.output` to 16              | caught |
| Revert the AVIF "higher bit depth" fix           | caught |
| Strip the guide's 8-bit scope                    | caught |
| Re-attribute 26% to the named study (built HTML) | caught |
| Reintroduce "adds no further loss" in built HTML | caught |

`test/pipeline-claims.test.ts` — 5 tests. `scripts/audit-content.mjs` — 7 new
patterns, 543 → 683 checks.

## 7. Decoder reality — PSD and PDF

Three fresh-context reviewers ran against app source. These are the defects that
came from reading the decoders rather than the prose.

| #    | Claim                                                                        | Verdict            | Evidence                                                                                                                                                                                                        |
| ---- | ---------------------------------------------------------------------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 7.1  | "A multi-page PDF exports as `name.png`, `name-2.png`…"                      | **FALSE**          | `main.ts:531` writes `` `${folderBase}-${i + 1}${ext}` `` for **every** page. Page one is `name-1.png`. A reader scripting against `name.png` gets a missing file                                               |
| 7.2  | "The ICC profile rides along" (PSD→PNG)                                      | **FALSE**          | `decode.ts:218-221` builds the sharp pipeline from a **raw RGBA buffer**, which carries no profile, so `keepIccProfile()` has nothing to keep. `@webtoon/psd` exposes `psd.icc_profile`; the app never reads it |
| 7.3  | "CMYK documents are converted for screen"                                    | **FALSE**          | The composite is read positionally as RGBA and `psd.colorMode` is never consulted, so a CMYK PSD is misread (K lands in the alpha channel), not remapped                                                        |
| 7.4  | "A 16-bit… document loses precision"                                         | **FALSE**          | `@webtoon/psd` throws `Unsupported image bit depth` for non-8-bit. It fails; it does not lose precision                                                                                                         |
| 7.5  | "a PSD saved without a compatibility composite will not convert"             | **FALSE**          | No such check exists — `psd.composite()` is called unconditionally. The realistic outcome is a wrong image reported as success                                                                                  |
| 7.6  | "pages… sort correctly in… anything that reads the directory"                | **FALSE**          | Numbers are not zero-padded, so `name-10.png` sorts before `name-2.png` in any lexicographic listing                                                                                                            |
| 7.7  | "Rasterising a page at print resolution" ×2                                  | **FALSE**          | `decode.ts:229, 272` hard-code `viewportScale: 2.0` — roughly 144 dpi, not configurable                                                                                                                         |
| 7.8  | "rendering happens… one page at a time"                                      | **FALSE**          | The app's own comment says every requested page is rendered into memory at once — which is the actual justification for the 100-page cap                                                                        |
| 7.9  | "convert to TIFF and stay in a format that can carry the intent"             | **FALSE**          | PixelFerry's TIFF output is 8-bit RGB LZW with no CMYK path. The link also pointed at a TIFF→JPG page                                                                                                           |
| 7.10 | "start around quality 55–65" vs "start at the app's default of 80"           | **CONTRADICTORY**  | Same page, ~1000 words apart. 55–65 was already on this project's removed-as-unsupported list and had come back                                                                                                 |
| 7.11 | "compressed as a JPEG when it was uploaded… a third lossy generation"        | **CONTRADICTORY**  | The same page says "the file itself does not record which". A previously-removed "almost certainly a JPEG" had returned, strengthened to a flat assertion                                                       |
| 7.12 | "A WebP found on the web has already been through at least one lossy encode" | **FALSE** absolute | Lossless WebP is common for UI assets — the sibling page is about producing exactly that                                                                                                                        |
| 7.13 | "Turning on metadata removal drops EXIF…"                                    | **FALSE**          | `removeMetadata: true` in `DEFAULT_RECIPE`; `pipeline.ts:40` defaults it on                                                                                                                                     |
| 7.14 | "only matters if you feed it a PNG" (white flatten)                          | **FALSE**          | Flatten applies to every alpha-bearing source, HEIC included                                                                                                                                                    |
| 7.15 | "the Quick Action offers… one size setting"                                  | **FALSE**          | Four named presets                                                                                                                                                                                              |
| 7.16 | "WebP compresses alpha separately with its own predictors"                   | **WRONG MODE**     | True of lossy WebP's `ALPH` chunk; in lossless VP8L alpha is in the same ARGB stream — and lossless is what the page is about                                                                                   |
| 7.17 | "cwebp -lossless… gives the same result"                                     | **OVERSTATED**     | Same pixels, different bytes — the two pass different effort settings to libwebp                                                                                                                                |
| 7.18 | "one 40-megapixel scan is 90 MB and another is 240 MB"                       | **UNSOURCED**      | 240 MB is exactly the uncompressed size, so the example illustrated compressed-vs-uncompressed, not the LZW variance it claimed                                                                                 |

## 8. Legal — a retention promise nothing implements

This is the most serious finding in the pass, and it is not a wording problem.

`/privacy` published two dated retention commitments to data subjects:

> "Waitlist email and registration data: until you withdraw consent, or 24
> months after our last waitlist or launch-related communication, whichever
> occurs first" "Unconfirmed registrations: normally deleted within 30 days"

Verified against the API source:

- **Nothing deletes `waitlist_signups`.** The Worker's scheduled handler runs
  `sweepBugReports`, `reconcileOrphanedScreenshots` and `pruneStaleActivations`;
  the only `DELETE FROM` statements in the whole API target `bug_reports` and
  `activations`. The single other reference to the table is one `INSERT`.
- **The 30-day promise is not merely unimplemented, it is unexecutable.**
  `waitlist_signups` has no confirmation-status column, so the controller's own
  record cannot distinguish a confirmed registration from an unconfirmed one.
  Confirmation status lives at the email provider.

| #   | Claim                                                        | Verdict          | Action                                                                                                                                                                 |
| --- | ------------------------------------------------------------ | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 8.1 | "24 months after our last… communication"                    | **FALSE**        | No automated deletion exists. Replaced with what happens — kept as the consent record, deleted on request — and an explicit note that no retention schedule is set yet |
| 8.2 | "Unconfirmed registrations: normally deleted within 30 days" | **UNEXECUTABLE** | Removed. The schema cannot identify them                                                                                                                               |
| 8.3 | "Your consent status and confirmation status"                | **FALSE**        | Confirmation status is not in the controller's record. Replaced with the verbatim consent wording and timestamp, which is what is stored                               |
| 8.4 | "Technical information… which may include your IP address"   | **MISLEADING**   | The IP is never stored raw — only a salted, purpose-scoped one-way pseudonym. Reworded, which is both accurate and more favourable to the data subject                 |
| 8.5 | "the coming-soon website"                                    | **STALE**        | It is now a 20-URL site                                                                                                                                                |

## 9. A finding that was withdrawn

One reviewer initially reported that the privacy policy failed to cover the
desktop app's update check, licence validation, beta safety check and bug-report
upload, and then **retracted it** after auditing the app source: at `f6bd954`
`apps/desktop/src/**` contains no network client at all. No updater, no licence
call, no telemetry, no crash reporter; `electron-updater` and Sentry appear in
no lockfile. The only `net.fetch` resolves a `file://` URL inside the app
bundle.

The four network paths are described in the **app repo's own policy**, in the
present tense, for clients that have not been built. The server side exists and
is deployed; the desktop clients do not.

So `product.ts` — "Images are converted on your Mac. Nothing is uploaded." — is
**TRUE today**, and the site's silence about update and licence processing is
correct rather than an omission. It is recorded here because the opposite
conclusion was reached first, and because it will stop being true the moment an
updater ships.

What did survive from that thread: the site said the app's "test suite fails the
build if an outbound request path is added". The test greps for six specific
call patterns and would not catch Node `http`/`https`, `child_process`,
`sendBeacon`, an aliased call or a dependency. Scoped on the page and in
`CLAUDE.md`.

## 10. The upstream dependency, and how it resolved

**Historical.** Earlier revisions of this section described four app commits as
having "landed on main during the review", then as a pending candidate. The
accurate account is in the pin history above. What follows is the outcome.

### What PR #70 changed, verified on the merged main

| Behaviour                       | Before                                                                                                                                                       | After                                                            |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| `PDF → HEIC`, `PDF → ICO`       | threw "Unsupported output format"                                                                                                                            | works                                                            |
| trim, target size on PDF pages  | silently ignored per page                                                                                                                                    | applied                                                          |
| HEIC output metadata/ICC policy | not applied — a Display P3 photo came out untagged                                                                                                           | applied, same contract as every other encoder                    |
| trim vs metadata                | trim continued the encode from a raw pixel buffer, which carries no ICC or EXIF, so enabling trim silently inverted the metadata contract in both directions | the raw buffer is geometry only; the encode reopens the original |
| README input-only list          | named HEIC                                                                                                                                                   | HEIC removed                                                     |

`/formats` says "Any input can be converted to any of these". That was **false**
when this branch was written and is **true** on the merged main.

The last row arrived after the audited candidate — it was not in `048a5a4`. It
does not contradict anything published here; it makes the app more consistent
with what this site already said about metadata and colour. It is recorded
because it is the concrete reason step 4 of the release sequence exists.

### The site's own claims are unaffected by the merge

The format matrix, the 8-bit pipeline, four-corner border detection, the PSD
decoder limits, metadata-on-by-default, quality 80 and the 100-page PDF cap were
all true on main before PR #70 and remain true after.

## 11. Residual closure pass

A later review of the merged state found the product-model fixes real but the
public-content pass incomplete. Worked from **rendered output**, not the diff.

| #     | Claim, as rendered                                                                                                         | Class               | Action                                                                                                                      |
| ----- | -------------------------------------------------------------------------------------------------------------------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| 11.1  | `/convert/jpg-to-avif` title "the smallest current web format"; summary "usually the smallest… also the slowest to encode" | UNSUPPORTED ranking | Rewritten to what is measurable: often smaller than JPEG at comparable quality, markedly slower **on PixelFerry's encoder** |
| 11.2  | "A sky that bands at JPEG quality 60 typically holds together at an **equivalent AVIF setting**"                           | CONTRADICTORY       | The same page says the scales do not convert. Removed entirely — replaced with a reason to test                             |
| 11.3  | "AVIF's useful range generally sits lower" / "the useful range tends to sit lower as the codec gets better"                | UNSUPPORTED         | No basis for a general ordering of encoder control values. Both removed                                                     |
| 11.4  | "each takes several times longer than the JPEG equivalent"                                                                 | OVERSTATED          | Scoped to this encoder, pointing at the measured ratios                                                                     |
| 11.5  | "Many desktop image tools will not open an AVIF. Email clients largely will not render one."                               | OVERSTATED          | Softened, with "check the specific destination"                                                                             |
| 11.6  | `choosing-an-image-format` "The universal default" / "Effectively everything that opens images reads it"                   | UNSUPPORTED         | "The default almost everywhere… about as broad as an image format gets"                                                     |
| 11.7  | "Never use it as a working format"                                                                                         | OVERSTATED          | Recast as the recommendation it is                                                                                          |
| 11.8  | "JPEG at quality **85–90**"                                                                                                | UNSOURCED           | Replaced with the app's real default of 80 and "adjust after looking"                                                       |
| 11.9  | "**Camera RAW** is not an image at all"                                                                                    | OVERSTATED          | "not a finished rendered image — largely unprocessed sensor readings"                                                       |
| 11.10 | Delivery formats "discard what a viewer will not notice"                                                                   | CONTRADICTORY       | The list includes PNG. Split into lossy and lossless                                                                        |
| 11.11 | "Serving a 4000px image into a 1200px column wastes more bytes than **any** format choice recovers"                        | OVERSTATED          | Flagged in an earlier pass and still present. Now "usually the larger of the two savings"                                   |
| 11.12 | An invented "60 MB TIFF" example, twice                                                                                    | UNSOURCED           | Removed                                                                                                                     |
| 11.13 | `/convert/heic-to-png` "A result **many times** the size of the HEIC is normal"                                            | UNSOURCED           | Survived a pass that reported multipliers removed. Now non-numeric, saying explicitly that no corpus fixes the ratio        |
| 11.14 | "from the PNG onward, every save is exact"                                                                                 | HALF-TRUE           | Scoped to saves that stay lossless; a later JPEG re-export is not exact                                                     |
| 11.15 | `/convert/raw-to-jpg` "sensor data, not pictures"                                                                          | IMPRECISE           | "largely unprocessed sensor readings, not finished images"                                                                  |
| 11.16 | "The JPEG is **substantially** smaller than the RAW"                                                                       | OVERSTATED          | States the mechanism instead of a magnitude                                                                                 |
| 11.17 | "RAW originals that most software will not open **in a decade**"                                                           | UNSUPPORTED         | A prediction. Replaced with the actual dependency on a vendor decoder                                                       |
| 11.18 | "some frames **will occasionally** be unreadable… 397 files where you expected 400"                                        | UNSUPPORTED         | Invented failure frequency and example. The product capability — per-file decode failure reporting — is enough              |
| 11.19 | "supported by every current browser"; "Keep your originals in something universal"; "always gives a better result"         | ABSOLUTE            | Scoped to "every current major browser", "widely-readable", and a conditional                                               |
| 11.20 | "lossy WebP will usually be **dramatically** smaller"; "a 16-bit scan is typically **many times** the size"                | OVERSTATED          | Both now state the mechanism rather than an unmeasured magnitude                                                            |

Verified as sound and deliberately left: "near-universal compatibility"
(hedged), the target-size search saving "the smallest result" (a product fact),
`sips … formatOptions 85` (command syntax), and AVIF "often the smallest of
these four on photographic content, though it depends on the image" (scoped).

**Four narrow guards** were added over rendered HTML with `<pre>`/`<code>`
stripped, so command examples are allowlisted structurally rather than by regex:
cross-codec quality equivalence, invented quality bands, unscoped codec
rankings, and unsourced size multiples. All four mutation-tested.

### Second wave — what a fresh-context reviewer found after those fixes

Run against rendered output with no expectation set. It returned 33 defects;
every one was investigated against app source at `f107ef7`.

| #     | Claim                                                                                                                                                                           | Verdict                                                     | Evidence                                                                                                                                                                                                                                                                              |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 11.21 | Homepage FAQ: HEIC output "is transcoded by the system sips tool… so **this option does not govern it**"                                                                        | **P0 FALSE**                                                | The FAQ restated the caveat as a literal instead of reading `capabilities.metadataHeicCaveat`, so the data-model fix never reached it. `main.ts` applies `keepIccProfile()`/`keepMetadata()` to the HEIC intermediate. It now interpolates the constant, so it cannot drift again     |
| 11.22 | "a target file size **re-runs the decode and resize** for each quality it tries, up to eight times"                                                                             | **P0 FALSE — introduced by an earlier pass of this review** | `pipeline.ts`: "the source is decoded and resized ONCE"; the resized pixels are held as raw and every attempt re-encodes from them. The clone path that re-decodes applies only when metadata is preserved (not the default) or the source is animated. Corrected to state both cases |
| 11.23 | "12 million pixels **× 4 bytes**… the decode carries an alpha channel through"                                                                                                  | **FALSE — also introduced by an earlier pass**              | Measured then from a 16-bit synthetic source, which is not the camera case. Re-measured: a photographic HEIC through `sips -s format tiff` gives `channels=3, hasAlpha=false`, and the PNG follows. Now × 3, and the alpha row says PixelFerry adds no channel                        |
| 11.24 | "CMYK and 16-bit PSDs are **not supported**"                                                                                                                                    | CONFLATED                                                   | They fail differently, and merging them hides the dangerous one: 16-bit throws, CMYK silently succeeds and is misread. Both pages now say so separately                                                                                                                               |
| 11.25 | "the composite that Photoshop stores inside **every PSD**"                                                                                                                      | ABSOLUTE                                                    | Contradicted by the same page's own limitation about files saved without a compatibility composite                                                                                                                                                                                    |
| 11.26 | Animation "keeps **every frame** when the target also supports animation"                                                                                                       | INCOMPLETE                                                  | `preserveAnimation = isAnimatedSource && ANIMATABLE_OUTPUT.has(format) && !trimWhitespace`. Two conditions were missing: whitespace trim drops frames, and the animated output set is GIF and WebP only — not AVIF                                                                    |
| 11.27 | `/cookies` schedule listing a first-party `pf-consent` key                                                                                                                      | FALSE                                                       | The site sets no cookie and writes no storage key; `security.spec.ts` asserts it. A published cookie schedule naming a key nothing writes. Row removed, with a note to restore it only alongside a consent tool                                                                       |
| 11.28 | Homepage mock: `2.4 MB → 340 KB (−86%)` on **both** a HEIC and a CR3                                                                                                            | UNSOURCED                                                   | Byte-identical results for two codecs, and 2.4 MB is not a plausible CR3. Made distinct and plausible, and the preview now carries a visible caption saying it is an illustration with example figures                                                                                |
| 11.29 | "mozjpeg **consistently** produces smaller files than the standard JPEG encoder"                                                                                                | UNSOURCED absolute                                          | No named baseline. Now "generally… than a baseline libjpeg encode"                                                                                                                                                                                                                    |
| 11.30 | "Markedly better on smooth gradients — skies band far less"                                                                                                                     | UNSOURCED                                                   | The sibling page hedges the identical claim. Aligned                                                                                                                                                                                                                                  |
| 11.31 | "encode time **climbs steeply at the top of the scale**"                                                                                                                        | UNMEASURED                                                  | Every recorded AVIF timing is at quality 80. Reworded and the limit stated                                                                                                                                                                                                            |
| 11.32 | "Resizing saves more bytes than switching format"                                                                                                                               | OVERSTATED                                                  | Unhedged in a takeaway while the body says "usually". Conditioned on the gap being wide                                                                                                                                                                                               |
| 11.33 | Preview "holds them all in memory" ×3; Automator error handling "effectively nonexistent"; "the black **most image libraries** default to" ×3; MPO "only one view is converted" | UNSOURCED third-party behaviour                             | Each restated as what is observable, or attributed to the encoder actually in play                                                                                                                                                                                                    |
| 11.34 | "**every current browser**"; "no Windows or Linux build has **ever** been produced or signed"; "Any input can be converted to any of these"                                     | ABSOLUTE                                                    | Scoped to "every current major browser", to what `package.json` establishes, and to carry the HEIC platform exception inline                                                                                                                                                          |
| 11.35 | "The **underlying** _WebP Lossless and Alpha Study_"                                                                                                                            | RE-ATTRIBUTION                                              | Calling it "underlying" re-attached the 26% figure to the study that does not contain it — the last item on the removal list, returning in softer form                                                                                                                                |
| 11.36 | HEIC "unreadable in a great deal of software"; "narrower than it used to be"; "start **above** the app's default of 80"; "run into gigabytes"                                   | OVERSTATED / UNSOURCED                                      | Each aligned with what the sibling pages and the evidence file already establish                                                                                                                                                                                                      |

Two of these — 11.22 and 11.23 — were **introduced by earlier passes of this
same review**, from a subagent report and a measurement taken on the wrong kind
of source. That is the argument for re-auditing rendered output rather than the
diff, and for re-measuring rather than trusting a recorded number.

Not fixed here: Cloudflare Turnstile is named on the homepage but appears in
neither policy, where the processor rows are still `[PROVIDER]` placeholders.
Disclosing a processor carries DPA and transfer obligations, so it stays a legal
blocker rather than an agent's edit.

### Third wave — the sweep was blind to the head

The previous pass reported "rendered sweep: 23 hits, zero actionable". That
conclusion was **not established**. The sweep stripped tags from the built HTML
and searched the remaining text, and a `<meta>` element carries its claim in an
attribute with no text node — so removing the element removed the claim. The
sweep could not have seen head metadata at any point.

Live at that HEAD, in four places on one page:

> "why resizing beats any codec choice for saving bytes"

— meta description, `og:description`, `twitter:description` and the JSON-LD
description. The same absolute the choosing-format guide had already been
corrected for, published in the fields most likely to be read first.

| #     | Claim                                                                                                                                           | Field                              | Verdict                 | Action                                                                                                                                                                                                                                                                                                                                |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 11.37 | "why resizing **beats any codec choice** for saving bytes"                                                                                      | description, og, twitter, JSON-LD  | OVERSTATED              | A codec change can beat a resize depending on source, target codec, how much resizing, content and encoder settings. Rewritten across all four, plus "No codec choice recovers that" and "the single most effective thing" in the body                                                                                                |
| 11.38 | "**Nothing is lost** converting an 8-bit JPEG"                                                                                                  | `/convert/jpg-to-avif` body        | TRUE-HALF / FALSE-WHOLE | True of bit depth, false of the operation: default AVIF output is `pipeline.avif({ quality })`, a second lossy encode, and the same page says so. Now states what is preserved and what is not                                                                                                                                        |
| 11.39 | "at the top of AVIF's scale it **mostly buys encode time**"; "encode time does **rise with the quality setting**"                               | two pages                          | UNMEASURED              | Every recorded AVIF timing is at quality 80. Both removed rather than dressed with a caveat                                                                                                                                                                                                                                           |
| 11.40 | "AVIF often produces smaller files than JPEG at comparable quality"; "Often the smallest of these four"; "Generally smaller than JPEG and WebP" | title, description, summary, body  | UNSOURCED ranking       | No primary benchmark is recorded, and this site's own measurement contains a case where AVIF q80 came out larger than WebP q80. Replaced with the codec mechanism — AV1 intra coding, variable block sizes, more prediction modes — which is a verifiable format fact, and an explicit statement that no general ranking is published |
| 11.41 | "Lossless WebP keeps **every pixel and every alpha value**"                                                                                     | `/convert/png-to-webp` description | SCOPE                   | The body carries the 8-bit scope; the description did not. Now "every 8-bit pixel"                                                                                                                                                                                                                                                    |
| 11.42 | "PNG and **TIFF are lossless**"                                                                                                                 | `llms.txt`                         | UNSCOPED                | Removed from the format model and pinned by a test scoped to `formats.ts`, while `llms.txt` kept publishing it. A guard bound to one surface is not a guard on the claim                                                                                                                                                              |
| 11.43 | "Always resize down from the original, **never** up"                                                                                            | takeaway                           | ABSOLUTE                | Recast as the reason it holds                                                                                                                                                                                                                                                                                                         |

### What the head-inclusive review then found

With the head in scope, a fresh reviewer returned 22 further defects. Every one
was checked against app source at `f107ef7`.

| #     | Claim                                                                                                                                                                                    | Field                                      | Verdict                | Evidence                                                                                                                                                                                                  |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 11.44 | "TIFF is **the lossless** archive format"; "It **is lossless**"                                                                                                                          | `/convert/tiff-to-jpg` description + body  | **P0 CONTRADICTORY**   | `/formats`, the format guide, `llms.txt` and `CLAUDE.md` all say a TIFF container is not lossless by definition. This page was the one surface never corrected, and the claim was in its meta description |
| 11.45 | "**Each PDF** gets its own folder"                                                                                                                                                       | 4 surfaces incl. `llms.txt` and `/formats` | CAPABILITY DRIFT       | `main.ts`: `if (pages.length > 1)` — only a MULTI-page PDF gets a folder; a single-page PDF is written as one plain file. The homepage FAQ had it right, so the site contradicted itself                  |
| 11.46 | "Google measures WebP 25–34% smaller than JPEG at matched SSIM"                                                                                                                          | `/convert/jpg-to-webp` description         | SCOPE STRIPPED         | The body carries the disqualifier — the study baselines libjpeg, PixelFerry writes mozjpeg — and the metadata did not. Baseline added                                                                     |
| 11.47 | "The ICC colour profile is **kept either way**"                                                                                                                                          | homepage FAQ + `llms.txt`                  | TRUE-HALF              | True of the metadata toggle, false for PSD, PDF and the portable HEIC fallback, whose decoders hand sharp a bare pixel buffer with no profile to keep. `/formats` says so; the FAQ did not                |
| 11.48 | "3.2 / 5.1 MB · ~4s left" on a converting row; "Each row shows **its own progress**"                                                                                                     | homepage mock + copy                       | CAPABILITY DRIFT       | The app renders an INDETERMINATE bar per row and has no per-file byte count or ETA; the only estimate is batch-level. The mock advertised a feature that does not exist                                   |
| 11.49 | "decoded with the macOS hardware codec rather than the bundled JavaScript fallback, **which is several times faster**"                                                                   | homepage                                   | INVERTED               | The nearest antecedent is the fallback, so the sentence asserts the opposite of the fact. Split into two sentences                                                                                        |
| 11.50 | "Slow to encode **at the effort level PixelFerry uses**"                                                                                                                                 | format guide                               | NON-EXISTENT SETTING   | `applyFormat` calls `avif({ quality })` with no `effort`; the app never touches sharp's speed control                                                                                                     |
| 11.51 | Size rules "apply to **every file in the queue**"                                                                                                                                        | homepage                                   | SCOPE                  | `encodeIcoOutput` returns before `applyResize`, so ICO ignores the general resize and its embedded sizes drive it                                                                                         |
| 11.52 | "why this is one to convert at **a higher quality than usual**"                                                                                                                          | `/convert/webp-to-jpg` description         | CONTRADICTORY          | The body says start at the default of 80. The description promised advice the body no longer gave — introduced when the body was corrected in an earlier pass                                             |
| 11.53 | "not the black **most image libraries** default to"                                                                                                                                      | `/convert/heic-to-jpg`                     | UNSOURCED              | Two sibling pages had already been scoped to "the underlying encoder"; this one was missed                                                                                                                |
| 11.54 | "**far more efficiently** than JPEG"; "typically **substantially** larger"; "**most of that difference** is the discarded layer data"; "PSDs are **the slowest thing** in a mixed batch" | four pages                                 | UNSOURCED COMPARATIVES | Each restated as the mechanism, which is verifiable, instead of an unmeasured magnitude                                                                                                                   |
| 11.55 | "plus the others **ImageIO knows about**"                                                                                                                                                | `/convert/raw-to-jpg`                      | OVERSTATED             | The accepted set is a hardcoded 27-extension list; an ImageIO-readable RAW outside it is rejected before decode                                                                                           |
| 11.56 | "**every built-in method**"; "AVIF … **has been for several years**"; "not a cost to the visitor"; hedges stripped from the RAW description                                              | four surfaces                              | ABSOLUTE / UNSOURCED   | Scoped, including noting that AVIF costs the visitor more to decode                                                                                                                                       |

Not every reviewer finding was accepted as written: its objection to the AVIF
timing range is recorded in the benchmark row of `docs/content-sources.md`
rather than by deleting a measurement that was genuinely taken.

### The methodology fix

`claimSurface(page)` in `scripts/lib/pages.mjs` returns visible `<main>` text
**and** title, meta description, OG/Twitter metadata and JSON-LD strings, read
through the parsed DOM rather than a regex over stripped text. The known-false
patterns in `audit:content` now run against that whole surface (683 → 686
checks), and `test/claim-surface.test.ts` proves by mutation — one field at a
time — that meta description, og:description, twitter:description, JSON-LD,
title and visible body are each genuinely inspected. Duplication measurement
stays on visible prose, so its meaning is unchanged.

One of the new guards was itself defective and the mutation test caught it: the
no-loss check ran to 80 characters and swept in the following clause, so
"Nothing is lost converting an 8-bit JPEG, **but this is not a route to a
higher-precision master**" redeemed itself on the word "precision" that belonged
to the disclaimer. Bounded at clause boundaries and re-mutated.

### Current-state documents

`docs/content-sources.md` and `src/data/product.ts` still described the app
README as wrong and the app privacy policy as present-tense about unbuilt
clients. Both were true before PR #70 merged and are false now: at `f107ef7` the
README lists the eight output formats and says HEIC reads anywhere and writes on
macOS, and the privacy policy marks the updater, licence validation, kill-switch
and bug reporting as "Not yet active". `product.ts` also carried two adjacent
comments about HEIC metadata whose conclusions contradicted each other. All
corrected to current state; the history stays here.

## 11. What remains open

- The app README at `f6bd954:README.md:81` still calls HEIC input-only. Source
  and tests say otherwise. **Not fixed here** — that is the app repo's to
  change.
- Legal identity on `/privacy` and `/cookies` is still placeholder, behind a
  DRAFT badge. Unresolvable without the controller's real details.
- The claims in §2 rest on published third-party studies. They were read at the
  URLs given; they can be revised by their publishers.
- **A retention period for waitlist data must be set and implemented.** The
  policy now says no schedule exists, which is true but is not a resting state.
  Either a sweep is added to the API or the period is defined and honoured.
- The processors are **determinable from source** — the email provider appears
  in `apps/api/src/lib/brevo.ts` and the platform in `wrangler.jsonc` and
  `public/_headers` — but the policy still shows `[PROVIDER NAME AND COUNTRY]`.
  Left as a placeholder deliberately: naming processors carries DPA and transfer
  obligations that are counsel's call, not an agent's. Flagged so the gap is not
  mistaken for "unknown".
- §6 International transfers hedges with "some providers **may** process…
  outside the EEA" when the actual set is determinable. Same reason, same owner.
