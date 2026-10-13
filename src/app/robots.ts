import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin/'],
      },
      // AI search, assistant and training crawlers: explicitly welcome, so
      // answer engines can read, cite and recommend the tools (GEO/AEO).
      // /llms.txt and /llms-full.txt are the plain-text maps written for them.
      {
        userAgent: [
          'OAI-SearchBot', 'ChatGPT-User', 'GPTBot',
          'ClaudeBot', 'Claude-User', 'Claude-SearchBot', 'anthropic-ai',
          'PerplexityBot', 'Perplexity-User',
          'Google-Extended', 'GoogleOther', 'Applebot', 'Applebot-Extended',
          'Bingbot', 'DuckAssistBot', 'YouBot', 'Amazonbot', 'meta-externalagent',
          'MistralAI-User', 'cohere-ai', 'Bytespider', 'CCBot',
        ],
        allow: '/',
        disallow: ['/api/'],
      },
      // Block aggressive crawlers from non-essential paths
      {
        userAgent: ['SemrushBot', 'AhrefsBot', 'MJ12bot'],
        disallow: ['/api/'],
        allow: '/',
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
