import type { MetadataRoute } from 'next';
import { tools } from '@/lib/tools-data';
import { posts } from '@/lib/blog';
import { SITE_URL } from '@/lib/site';

/**
 * Comprehensive sitemap for all pages. Tool pages are money pages with highest priority.
 * Blog articles feed authority to tool pages via internal links.
 */
export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const newest = posts[0]?.updated ?? posts[0]?.published;

  return [
    // Homepage - highest priority
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    // Blog index
    {
      url: `${SITE_URL}/blog`,
      lastModified: newest ? new Date(newest) : new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    // Trust / entity pages
    { url: `${SITE_URL}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/privacy`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE_URL}/terms`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    // Tool pages - these are the money pages
    ...tools.map((tool) => ({
      url: `${SITE_URL}/tools/${tool.slug}`,
      lastModified: new Date(),
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
