import { tools } from '@/lib/tools-data';
import { getToolFaqs, getToolSeo } from '@/lib/tool-seo';
import { getToolHowTo } from '@/lib/tool-howto';
import { posts, formatDate } from '@/lib/blog';
import type { Block } from '@/lib/blog';
import { SITE_NAME, SITE_URL, SITE_DESCRIPTION } from '@/lib/site';

export const dynamic = 'force-static';

/** Article text as Markdown, with site-relative links made absolute. */
function md(text: string): string {
  return text.replace(/\[([^\]]+)\]\((\/[^)\s]*)\)/g, (_, label: string, href: string) => `[${label}](${SITE_URL}${href})`);
}

function blockToMarkdown(b: Block): string {
  switch (b.type) {
    case 'p': return md(b.text);
    case 'h2': return `### ${b.text}`;
    case 'h3': return `#### ${b.text}`;
    case 'steps': return b.items.map((item, i) => `${i + 1}. ${md(item)}`).join('\n');
    case 'list': return b.items.map((item) => `- ${md(item)}`).join('\n');
    case 'table': return [
      `| ${b.head.join(' | ')} |`,
      `| ${b.head.map(() => '---').join(' | ')} |`,
      ...b.rows.map((r) => `| ${r.map(md).join(' | ')} |`),
    ].join('\n');
    case 'callout': return `> **${b.title}** ${md(b.text)}`;
  }
}

/**
 * /llms-full.txt — the full text of every English tool page and guide in one
 * Markdown file, so an answer engine can read the whole site in one fetch
 * and quote it accurately. Built from the same sources as the pages.
 */
export function GET() {
  const out: string[] = [
    `# ${SITE_NAME} — full text`,
    '',
    `> ${SITE_DESCRIPTION}`,
    '',
    `Every tool runs in the browser; files are never uploaded (Translate PDF sends extracted text to a translation service and says so). Free, no account, no watermark. Site map for AI assistants: ${SITE_URL}/llms.txt`,
    '',
    '## Tools',
    '',
  ];

  for (const t of tools) {
    const seo = getToolSeo(t.slug);
    const howTo = getToolHowTo(t.slug);
    out.push(`### ${t.name}`, '', `URL: ${SITE_URL}/tools/${t.slug}`, '', seo?.description ?? t.description, '');
    out.push(`#### ${howTo.title}`, '', howTo.intro, '', ...howTo.steps.map((s, i) => `${i + 1}. ${s}`), '');
    const faqs = getToolFaqs(t.slug);
    if (faqs.length) {
      out.push('#### FAQ', '');
      for (const f of faqs) out.push(`**${f.q}** ${f.a}`, '');
    }
  }

  out.push('## Guides', '');
  for (const p of posts) {
    out.push(
      `### ${p.title}`,
      '',
      `URL: ${SITE_URL}/blog/${p.slug}`,
      `Published ${formatDate(p.published)}${p.updated ? `, updated ${formatDate(p.updated)}` : ''}. By ${p.author.name}, ${p.author.role}.`,
      '',
      p.description,
      '',
      ...p.blocks.flatMap((b) => [blockToMarkdown(b), '']),
    );
    if (p.tool) out.push(`Tool: ${SITE_URL}/tools/${p.tool}`, '');
    if (p.faqs.length) {
      out.push('#### FAQ', '');
      for (const f of p.faqs) out.push(`**${f.q}** ${f.a}`, '');
    }
  }

  return new Response(out.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      // The same text lives on the HTML pages; keep this copy out of web search results.
      'X-Robots-Tag': 'noindex',
    },
  });
}
