import { defineCollection } from 'astro:content'
import { glob } from 'astro/loaders'
// `astro:content` still re-exports `z`, but marks it deprecated; the supported
// import is Astro's pinned zod build, which is the same instance the content
// layer validates with.
import { z } from 'astro/zod'

/**
 * Build-time content collections.
 *
 * The schemas are deliberately demanding. Every field that a *useful* page
 * needs is required, so a thin page cannot be authored by accident: a
 * conversion page that has nothing to say about what actually changes during
 * the conversion, or that cannot name a real limitation, fails the build
 * rather than shipping as filler.
 *
 * This is the structural half of the anti-scaled-content rule in CLAUDE.md.
 * The other half — no duplicated prose across pages, no boilerplate intros —
 * is enforced by `npm run audit:content`.
 */

const seoFields = {
  /** <title>. Written for a human; Google may still rewrite it. */
  title: z.string().min(15).max(120),
  /** Meta description. Unique per page — the audit fails on duplicates. */
  description: z.string().min(70).max(220),
  /** The <h1>, which may differ from the <title>. */
  heading: z.string().min(10).max(90),
  published: z.coerce.date(),
  updated: z.coerce.date(),
}

const conversions = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/conversions' }),
  schema: z.object({
    ...seoFields,
    /** Uppercase source format label, e.g. 'HEIC'. */
    from: z.string(),
    /** Uppercase target format label, e.g. 'JPG'. */
    to: z.string(),
    /** One sentence answering "what is this conversion for". */
    summary: z.string().min(60).max(300),

    /**
     * What actually changes in the file. Required, because "convert A to B" with
     * no account of what the conversion costs is exactly the empty page Google
     * calls scaled content.
     */
    whatChanges: z.array(z.object({ label: z.string(), detail: z.string().min(40) })).min(3),

    /** Honest limits — PixelFerry's, the format's, or macOS's. At least one. */
    limitations: z.array(z.string().min(30)).min(1),

    /** Concrete situations where someone does this. */
    useCases: z.array(z.string().min(25)).min(2),

    /**
     * What macOS already does for free. Naming the native route is the single
     * most useful thing these pages can do, and pretending it does not exist
     * would be the dishonest version.
     */
    macOSAlternative: z.object({
      method: z.string(),
      detail: z.string().min(60),
      /** Where the built-in route stops being enough. */
      breaksDownWhen: z.string().min(40),
    }),

    /** Slugs of related conversion pages. Checked to exist by audit:links. */
    related: z.array(z.string()).min(2).max(5),
  }),
})

const guides = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/guides' }),
  schema: z.object({
    ...seoFields,
    summary: z.string().min(60).max(300),
    /** Shown above the article; keeps the intent obvious at a glance. */
    takeaways: z.array(z.string().min(25)).min(3).max(6),
    /** Related conversion slugs, for internal linking out of the article. */
    relatedConversions: z.array(z.string()).min(1).max(6),
  }),
})

export const collections = { conversions, guides }
