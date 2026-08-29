---
title: How to batch resize images on a Mac without wrecking them
description:
  The built-in ways to resize many images at once, what crop, fit and fill
  actually do, and why resizing beats any codec choice for saving bytes.
heading: How to batch resize images on a Mac
published: 2026-08-29
updated: 2026-08-29
summary:
  Resizing is usually the biggest single saving available on an image set, and
  the option most often skipped. Here is what macOS gives you, what the fit
  modes mean, and the order of operations that matters.
takeaways:
  - Resizing saves more bytes than switching format, and the two compound.
  - Crop, fit and fill answer different questions — picking the wrong one
    silently ruins compositions.
  - The Finder Quick Action resizes to four named presets only; sips is the
    built-in that takes real pixel values.
  - Always resize down from the original, never up from a delivery copy.
relatedConversions:
  - jpg-to-webp
  - tiff-to-jpg
  - raw-to-jpg
---

The single most effective thing you can do to an oversized image set is make the
images smaller. Not "compress harder" — fewer pixels.

A 4000×3000 photograph displayed in a 1200-pixel column is carrying about eleven
times more pixel data than it will ever show. No codec choice recovers that.
Halving the dimensions quarters the pixel count. Encoded size drops steeply too,
though not by exactly four — lossy compression scales sub-linearly, and headers
and the colour profile do not scale at all.

## The built-in options

### Finder Quick Action

Right-click → Quick Actions → Convert Image gives you **Small, Medium, Large,
Actual Size**. Apple does not document what those map to in pixels, which is
exactly the problem: it is fine for "make these smaller for email" and useless
for "everything must be 1200px wide".

### Preview

Tools → Adjust Size takes real numbers — pixels, percent, or a resolution — with
a "Scale proportionally" checkbox and a resulting-size readout.

It also works on a **multi-selection**, which is not obvious and is worth
knowing: Apple's documentation describes displaying the images in the same
window, selecting them in that window's sidebar, and then choosing Tools →
Adjust Size to resize them together.

The limits are practical rather than absolute. Every image has to be open in one
window, Preview holds them all in memory, and there is no way to convert format
or set quality in the same step — so it is comfortable for a handful of images
and painful for a large folder.

### sips

The built-in that takes real values and scales:

```bash
# Cap the LONGEST edge at 2000px, preserving aspect ratio
sips -Z 2000 image.jpg

# Set width to exactly 1200px, height follows
sips --resampleWidth 1200 image.jpg

# Every JPEG in the folder, into a separate output directory
mkdir -p resized
for f in *.jpg; do sips -Z 2000 "$f" --out "resized/$f"; done
```

Note the difference between `-Z` (resampleHeightWidthMax — caps the long edge,
preserves aspect) and `-z` (resampleHeightWidth — forces exact dimensions and
**distorts** the image). The capital letter is almost always the one you want.

`sips` overwrites in place unless you pass `--out`. Always pass `--out`.

## Crop, fit and fill

When a target is an exact width **and** height, the source aspect ratio almost
never matches, and something has to give. The three answers:

**Fit** — scale until the whole image is inside the box. Nothing is cut off; you
get empty space on two sides. Right when you must see the entire image, such as
product shots on a white background.

**Crop** — scale until the box is full, then cut the overflow. Nothing is
distorted; content leaves the frame. Right for thumbnails and hero images where
filling the space matters more than the edges.

**Fill** — stretch to the box regardless of aspect ratio. Distorts. Almost never
what you want, and it exists mostly for cases where the aspect ratios already
match.

One caveat that catches people with Crop and Fill: PixelFerry does not enlarge by
default. A source smaller than the box keeps its own dimensions rather than being
scaled up — there is nothing to crop or stretch — so you get an image that is not
the size you asked for. Turn off "don't upscale" if you genuinely want it
enlarged.

The failure mode worth naming: batch-cropping a mixed set to a square. Landscape
photographs lose their sides and portraits lose heads. If the set is
inconsistent, fit is the safe choice.

## Order of operations

This matters and it is easy to get wrong.

**Resize, then compress.** Compressing a large image and then shrinking it means
you spent encoding effort on pixels you threw away, and the artefacts from the
first pass get scaled up along with everything else.

**Resize from the original, not from a delivery copy.** Scaling a 1200px JPEG up
to 2000px invents pixels and looks it. Go back to the source every time.

**Do both in one pass.** Decoding a 60 MB TIFF is the expensive part. Resizing
and converting in a single operation decodes it once; doing them in two tools
decodes it twice and writes a large intermediate to disk in between.

That last point is most of the reason to use one tool for both. In PixelFerry
the resize happens between the decode and the encode:

1. Decode, using the macOS system codec for HEIC and RAW.
2. Apply EXIF orientation so a portrait shot arrives upright.
3. Trim whitespace, if you asked for it.
4. Resize — by width, by height, to exact dimensions with crop/fit/fill, or by
   percentage.
5. Encode to the target format at your quality.

One decode, one write, four files at a time — with two exceptions: a target file
size re-runs the decode and resize for each quality it tries, up to eight times,
and HEIC output writes an intermediate before `sips` transcodes it. See
[JPG to WebP](/convert/jpg-to-webp) for what combining the two steps does to a
real image folder.

## A note on percentages

Percentage scaling is measured against the **post-trim** content width, not the
original canvas. If you enable whitespace trimming and then scale to 50%, you
get half of the trimmed content, not half of the original file. That is the
useful behaviour — it means a set of scans with inconsistent borders comes out
at consistent content size — but it will surprise you once if you do not know.
