import { SITE_NAME, SITE_URL } from './site';
import { SITE_AUTHOR, SITE_EMAIL } from './author';

/** Organization + WebSite schema for the homepage. */
export function generateOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/icon-512.png`,
    description: 'Free PDF toolkit that runs in your browser. Edit, convert, merge, compress, and secure PDFs without uploading.',
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
    name: SITE_NAME,
    url: SITE_URL,
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
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `${tool.name} — ${SITE_NAME}`,
    description: tool.description,
    url: `${SITE_URL}/tools/${tool.slug}`,
    inLanguage: 'en',
    isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE_URL },
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
