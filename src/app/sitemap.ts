import type { MetadataRoute } from 'next';
import { tools } from '@/lib/tools-data';
import { posts } from '@/lib/blog';
import { SITE_URL } from '@/lib/site';

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
const TOOL_DATE = new Date('2025-12-15');

export default function sitemap(): MetadataRoute.Sitemap {
  const newest = posts[0]?.updated ?? posts[0]?.published;

  return [
    // Homepage - highest priority
    {
      url: SITE_URL,
      lastModified: SITE_LAUNCH,
      changeFrequency: 'weekly',
      priority: 1,
    },
    // Blog index
    {
      url: `${SITE_URL}/blog`,
      lastModified: newest ? new Date(newest) : SITE_LAUNCH,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    // Trust / entity pages
    { url: `${SITE_URL}/about`, lastModified: SITE_LAUNCH, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/privacy`, lastModified: SITE_LAUNCH, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/terms`, lastModified: SITE_LAUNCH, changeFrequency: 'yearly', priority: 0.3 },
    // Tool pages - these are the money pages
    ...tools.map((tool) => ({
      url: `${SITE_URL}/tools/${tool.slug}`,
      lastModified: TOOL_DATE,
      changeFrequency: 'monthly' as const,
      priority: tool.featured ? 1 : 0.9,
    })),
    // Blog articles
    ...posts.map((post) => ({
      url: `${SITE_URL}/blog/${post.slug}`,
      lastModified: new Date(post.reviewed ?? post.updated ?? post.published),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
  ];
}
