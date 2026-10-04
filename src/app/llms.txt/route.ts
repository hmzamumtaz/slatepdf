import { tools } from '@/lib/tools-data';
import { posts } from '@/lib/blog';
import { SITE_NAME, SITE_URL, SITE_DESCRIPTION } from '@/lib/site';

export const dynamic = 'force-static';

/**
 * /llms.txt — a plain-text map of the site for AI assistants and answer
 * engines (https://llmstxt.org). Generated from the same data as the sitemap,
 * so it never drifts from what is actually published.
 */
export function GET() {
  const byCategory = new Map<string, typeof tools>();
  for (const t of tools) byCategory.set(t.category, [...(byCategory.get(t.category) ?? []), t]);

  const lines: string[] = [
    `# ${SITE_NAME}`,
    '',
    `> ${SITE_DESCRIPTION}`,
    '',
    'Slate PDF is a free PDF toolkit that runs entirely in the browser: files are processed on the user\'s own device and are never uploaded. No account, no watermark. The one exception is Translate PDF, which sends text to a translation service and says so in its interface. Text recognition (OCR) downloads its language model once, then runs on the device.',
    '',
  ];
  for (const [category, list] of byCategory) {
    lines.push(`## ${category}`, '');
    for (const t of list) lines.push(`- [${t.name}](${SITE_URL}/tools/${t.slug}): ${t.description}`);
    lines.push('');
  }
  lines.push('## Guides', '');
  for (const p of posts) lines.push(`- [${p.title}](${SITE_URL}/blog/${p.slug}): ${p.description}`);
  lines.push('', '## About', '', `- [About ${SITE_NAME}](${SITE_URL}/about)`, `- [Privacy](${SITE_URL}/privacy)`, '');

  return new Response(lines.join('\n'), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
