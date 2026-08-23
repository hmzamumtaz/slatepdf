import type { MetadataRoute } from 'next';
import { tools } from '@/lib/tools-data';
import { posts } from '@/lib/blog';
import { SITE_URL } from '@/lib/site';

/**
 * Every page on the site, in one place. The tool pages are the money pages, so
 * they carry the highest priority after the home page; articles feed them.
 */
export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const newest = posts[0]?.updated ?? posts[0]?.published;

  return [
    { url: SITE_URL, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/blog`, lastModified: newest, changeFrequency: 'weekly', priority: 0.8 },
    ...tools.map((tool) => ({
      url: `${SITE_URL}/tools/${tool.slug}`,
      changeFrequency: 'monthly' as const,
      priority: 0.9,
    })),
    ...posts.map((post) => ({
      url: `${SITE_URL}/blog/${post.slug}`,
      lastModified: post.updated ?? post.published,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
  ];
}
