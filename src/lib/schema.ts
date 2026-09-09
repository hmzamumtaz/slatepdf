import { SITE_NAME, SITE_URL } from './site';
import { SITE_AUTHOR, SITE_EMAIL } from './author';

/** Organization + WebSite schema for the homepage. */
export function generateOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/logo.svg`,
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
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_URL}/?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}

/** SoftwareApplication schema for a tool page. */
export function generateSoftwareApplicationSchema(tool: {
  name: string;
  description: string;
  slug: string;
  category: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: `${SITE_NAME} — ${tool.name}`,
    description: tool.description,
    url: `${SITE_URL}/tools/${tool.slug}`,
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Any (Browser-based)',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
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
