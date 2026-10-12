import type { MetadataRoute } from 'next';
import { tools } from '@/lib/tools-data';
import { posts } from '@/lib/blog';
import { SITE_URL } from '@/lib/site';
import { LOCALES } from '@/i18n/config';
import { languageAlternates } from '@/i18n/alternates';
import { hrefFor, type PageKey } from '@/i18n/paths';

/**
 * Comprehensive sitemap for all pages. Tool pages are money pages with highest priority.
 * Blog articles feed authority to tool pages via internal links.
 *
 * Static pages (home, about, legal) use a fixed date rather than `new Date()`, so the
 * sitemap stops advertising every URL as freshly-updated on each build. Google uses
 * lastmod to prioritise crawling; constant "today" dates dilute it for genuinely new content.
 */
export const dynamic = 'force-static';

const SITE_LAUNCH = new Date('2025-11-01');
// Last real change to every tool page: tool-specific how-to steps, guide links
// and the /tools hub (2026-10-12).
const TOOL_DATE = new Date('2026-10-12');
// Translated pages first published.
const I18N_DATE = new Date('2026-10-12');

/** The same page in every translated language, each listing all its alternates. */
function translated(page: PageKey, priority: number): MetadataRoute.Sitemap {
  const languages = languageAlternates(page);
  return LOCALES.map(locale => ({
    url: `${SITE_URL}${hrefFor(locale, page)}`,
    lastModified: I18N_DATE,
    changeFrequency: 'monthly' as const,
    priority,
    alternates: { languages },
  }));
}

export default function sitemap(): MetadataRoute.Sitemap {
  const newest = posts[0]?.updated ?? posts[0]?.published;

  return [
    // Homepage - highest priority
    {
      url: SITE_URL,
      lastModified: SITE_LAUNCH,
      changeFrequency: 'weekly',
      priority: 1,
      alternates: { languages: languageAlternates({ kind: 'home' }) },
    },
    // Blog index
    {
      url: `${SITE_URL}/blog`,
      lastModified: newest ? new Date(newest) : SITE_LAUNCH,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    // All-tools hub
    {
      url: `${SITE_URL}/tools`,
      lastModified: TOOL_DATE,
      changeFrequency: 'monthly',
      priority: 0.9,
      alternates: { languages: languageAlternates({ kind: 'hub' }) },
    },
    // Trust / entity pages
    { url: `${SITE_URL}/about`, lastModified: SITE_LAUNCH, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/verify-no-upload`, lastModified: TOOL_DATE, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/privacy`, lastModified: SITE_LAUNCH, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/terms`, lastModified: SITE_LAUNCH, changeFrequency: 'yearly', priority: 0.3 },
    // Tool pages - these are the money pages
    ...tools.map((tool) => ({
      url: `${SITE_URL}/tools/${tool.slug}`,
      lastModified: TOOL_DATE,
      changeFrequency: 'monthly' as const,
      priority: tool.featured ? 1 : 0.9,
      alternates: { languages: languageAlternates({ kind: 'tool', slug: tool.slug }) },
    })),
    // Translated home, hub and tool pages
    ...translated({ kind: 'home' }, 0.8),
    ...translated({ kind: 'hub' }, 0.7),
    ...tools.flatMap(tool => translated({ kind: 'tool', slug: tool.slug }, 0.8)),
    // Blog articles
    ...posts.map((post) => ({
      url: `${SITE_URL}/blog/${post.slug}`,
      lastModified: new Date(post.reviewed ?? post.updated ?? post.published),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
  ];
}
