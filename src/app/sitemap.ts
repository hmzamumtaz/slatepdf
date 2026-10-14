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
// Last real change to the /tools hub and the no-upload proof page.
const HUB_DATE = new Date('2026-10-12');
// Last real change to every tool page, in every language: a third FAQ, the
// "at a glance" facts table and HowTo structured data (2026-10-13).
const TOOL_DATE = new Date('2026-10-13');
// Translated home and hub pages first published.
const I18N_DATE = new Date('2026-10-12');
// Homepage FAQ rewritten, crawlable and marked up as FAQPage.
const HOME_DATE = new Date('2026-10-13');

/** A post's newest real date: publication, content update or editorial review. */
function postDate(post: (typeof posts)[number]): Date {
  return new Date([post.published, post.updated, post.reviewed].filter((d): d is string => !!d).sort().at(-1)!);
}

/** The same page in every translated language, each listing all its alternates. */
function translated(page: PageKey, priority: number, lastModified = I18N_DATE): MetadataRoute.Sitemap {
  const languages = languageAlternates(page);
  return LOCALES.map(locale => ({
    url: `${SITE_URL}${hrefFor(locale, page)}`,
    lastModified,
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
      lastModified: HOME_DATE,
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
      lastModified: HUB_DATE,
      changeFrequency: 'monthly',
      priority: 0.9,
      alternates: { languages: languageAlternates({ kind: 'hub' }) },
    },
    // Trust / entity pages
    { url: `${SITE_URL}/about`, lastModified: SITE_LAUNCH, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/verify-no-upload`, lastModified: HUB_DATE, changeFrequency: 'monthly', priority: 0.7 },
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
    ...tools.flatMap(tool => translated({ kind: 'tool', slug: tool.slug }, 0.8, TOOL_DATE)),
    // Blog articles
    ...posts.map((post) => ({
      url: `${SITE_URL}/blog/${post.slug}`,
      lastModified: postDate(post),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
  ];
}
