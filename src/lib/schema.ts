import { site, absoluteUrl } from '../data/site'
import { product, outputFormatLabels, macOSOnlyWriteFormats, formatCounts } from '../data/product'

/**
 * JSON-LD builders.
 *
 * Rules this file exists to enforce, all of them Google spam-policy adjacent:
 *
 *  - Nothing here is invented. Every value traces to `src/data/product.ts`,
 *    which traces to the app repo.
 *  - NO `aggregateRating`, NO `review`, NO `offers`. Google's SoftwareApplication
 *    rich result requires `offers.price` AND (`aggregateRating` OR `review`);
 *    PixelFerry is an unreleased private beta with no ratings and no price, so
 *    it is simply NOT ELIGIBLE. The previous site claimed a `price: "0"`
 *    `PreOrder` offer to qualify, which described a free product that does not
 *    exist. Describing reality and forgoing the rich result is the only honest
 *    option — see docs/seo.md.
 *  - NO `Organization` node. The legal controller is still an unfilled
 *    placeholder in the Privacy Policy, and inventing a publisher entity to
 *    satisfy a validator would be fabricating a legal fact.
 */

type Thing = Record<string, unknown>

/** The site itself. `WebSite` is the entity anchor for the domain. */
export function webSiteSchema(): Thing {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${site.origin}/#website`,
    url: `${site.origin}/`,
    name: site.name,
    description: site.shortDescription,
    inLanguage: site.locale,
  }
}

/**
 * The product. Deliberately descriptive rather than rich-result-shaped: it
 * exists so Search and AI systems can resolve "PixelFerry" to a real thing
 * with real properties, not to farm a stars widget.
 */
export function softwareApplicationSchema(): Thing {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    '@id': `${site.origin}/#app`,
    name: product.name,
    applicationCategory: 'MultimediaApplication',
    applicationSubCategory: 'Image converter',
    operatingSystem: product.minimumOS.label,
    processorRequirements: product.architectures,
    url: `${site.origin}/`,
    description: site.shortDescription,
    softwareVersion: undefined,
    releaseNotes: undefined,
    featureList: [
      'Batch conversion of mixed image formats',
      `Reads ${formatCounts.readable} format families covering ${formatCounts.extensions} file extensions`,
      `Output to ${outputFormatLabels.join(', ')}`,
      `${macOSOnlyWriteFormats.map((f) => f.label).join(', ')} output requires macOS`,
      'Resize by width, height, exact dimensions or percentage',
      'Per-format quality and lossless controls',
      'Whitespace trimming',
      'Local, on-device conversion with no upload of source files',
    ],
    // Factually the deployment model, and the single most useful thing an AI
    // answer can state about this product.
    isAccessibleForFree: undefined,
    inLanguage: site.locale,
  }
}

/** Breadcrumbs for any page below the root. */
export function breadcrumbSchema(trail: { name: string; path: string }[]): Thing {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((crumb, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  }
}

/**
 * A guide. Only used where the page genuinely IS an article — a
 * standalone explainer with a publication date — never on hub or product pages.
 */
export function articleSchema(input: {
  headline: string
  description: string
  path: string
  published: string
  modified: string
}): Thing {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: input.headline,
    description: input.description,
    mainEntityOfPage: { '@type': 'WebPage', '@id': absoluteUrl(input.path) },
    datePublished: input.published,
    dateModified: input.modified,
    inLanguage: site.locale,
    image: absoluteUrl(site.ogImage.path),
    // No `author`/`publisher`: attributing this to a person or company would
    // mean inventing credentials or a legal entity we have not verified.
  }
}

/**
 * Drop keys whose value is `undefined` so they never serialise, and prove the
 * result is valid JSON. Used by every page that emits a block.
 */
export function clean(thing: Thing): Thing {
  return JSON.parse(JSON.stringify(thing)) as Thing
}
