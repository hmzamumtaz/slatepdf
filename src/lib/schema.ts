import { SITE_NAME, SITE_SLUG, SITE_TAGLINE, SITE_URL } from './site';
import { SITE_AUTHOR, SITE_EMAIL } from './author';
import { ALL_LOCALES } from '@/i18n/config';

/**
 * Stable node ids. Every page's structured data points at the same
 * Organization and WebSite nodes, so search and answer engines resolve
 * "Slate PDF" to one entity rather than a loose name on each page.
 */
export const ORG_ID = `${SITE_URL}/#organization`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

/** Organization schema, emitted on every page by the root layout. */
export function generateOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': ORG_ID,
    name: SITE_NAME,
    alternateName: [SITE_SLUG, 'slatepdf.space'],
    url: SITE_URL,
    logo: { '@type': 'ImageObject', url: `${SITE_URL}/icon-512.png`, width: 512, height: 512 },
    slogan: SITE_TAGLINE,
    description: 'Free PDF toolkit that runs in your browser. Edit, convert, merge, compress, OCR, sign and secure PDFs without uploading them, with no account and no watermark.',
    knowsAbout: ['PDF', 'PDF editing', 'PDF conversion', 'PDF compression', 'OCR', 'Electronic signatures', 'Document privacy', 'Client-side file processing'],
    sameAs: ['https://github.com/hmzamumtaz/slatepdf'],
    founder: { '@type': 'Person', name: SITE_AUTHOR.name, jobTitle: SITE_AUTHOR.role, url: `${SITE_URL}/about` },
    employee: { '@type': 'Person', name: SITE_AUTHOR.name, jobTitle: SITE_AUTHOR.role, url: `${SITE_URL}/about` },
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      email: SITE_EMAIL,
      areaServed: 'Worldwide',
      availableLanguage: 'English',
    },
  };
}

export function generateWebSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    name: SITE_NAME,
    alternateName: SITE_SLUG,
    url: SITE_URL,
    description: 'Free PDF tools that run in your browser: merge, split, compress, convert, edit, sign and protect PDFs without uploading them.',
    inLanguage: ALL_LOCALES,
    publisher: { '@id': ORG_ID },
  };
}

/** The WebPage node every page type shares; `extra` adds type-specific fields. */
export function generateWebPageSchema(page: { name: string; description: string; url: string; inLanguage: string; dateModified?: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': page.url,
    name: page.name,
    description: page.description,
    url: page.url,
    inLanguage: page.inLanguage,
    isPartOf: { '@id': WEBSITE_ID },
    publisher: { '@id': ORG_ID },
    ...(page.dateModified ? { dateModified: page.dateModified } : {}),
  };
}

/**
 * HowTo schema mirroring the visible how-to steps on a tool page. Google no
 * longer shows HowTo rich results, but answer engines still read the steps.
 */
export function generateHowToSchema(howTo: { title: string; intro: string; steps: string[] }, url: string, inLanguage: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: howTo.title,
    description: howTo.intro,
    inLanguage,
    estimatedCost: { '@type': 'MonetaryAmount', currency: 'USD', value: '0' },
    tool: { '@type': 'HowToTool', name: `${SITE_NAME} (web browser)` },
    step: howTo.steps.map((text, i) => ({ '@type': 'HowToStep', position: i + 1, text, url: `${url}#how-to` })),
  };
}

/**
 * WebPage schema for a tool page.
 *
 * Deliberately not SoftwareApplication: Google requires aggregateRating or
 * review for that type and reports every page without one as an invalid item
 * in Search Console. We have no genuine ratings and will not invent them.
 */
export function generateToolPageSchema(tool: {
  name: string;
  description: string;
  slug: string;
  category: string;
}) {
  return generateWebPageSchema({
    name: `${tool.name} — ${SITE_NAME}`,
    description: tool.description,
    url: `${SITE_URL}/tools/${tool.slug}`,
    inLanguage: 'en',
  });
}

/**
 * SoftwareApplication schema with the tool's real visitor rating. Only call
 * it once the tool has enough genuine votes (see MIN_PUBLIC_VOTES): Google
 * requires aggregateRating for this type, and the figure must match the
 * rating shown on the page.
 */
export function generateToolRatingSchema(
  tool: { name: string; description: string; slug: string },
  rating: { count: number; average: number },
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: tool.name,
    description: tool.description,
    url: `${SITE_URL}/tools/${tool.slug}`,
    applicationCategory: 'UtilitiesApplication',
    publisher: { '@id': ORG_ID },
    operatingSystem: 'Any (runs in a web browser)',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: rating.average.toFixed(1),
      ratingCount: rating.count,
      bestRating: '5',
      worstRating: '1',
    },
  };
}

/** FAQPage schema for tool pages. */
export function generateFAQSchema(faqs: { q: string; a: string }[]) {
  if (!faqs.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

/** BreadcrumbList schema. */
export function generateBreadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
