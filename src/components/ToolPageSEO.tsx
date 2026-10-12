import Link from 'next/link';
import { ArrowRight, BookOpenText } from 'lucide-react';
import Breadcrumbs from './Breadcrumbs';
import type { ReactNode } from 'react';
import { categoryAnchor, getNextTools, getToolBySlug, tools } from '@/lib/tools-data';
import { getToolFaqs } from '@/lib/tool-seo';
import { getToolHowTo } from '@/lib/tool-howto';
import { posts } from '@/lib/blog';
import { generateBreadcrumbSchema } from '@/lib/schema';
import { SITE_URL } from '@/lib/site';

/**
 * Server-rendered SEO content for tool pages: breadcrumbs, a tool-specific
 * how-to, the visible FAQ, guides about this tool, and next-step tools.
 * A server component on purpose — it reads blog data, which must never be
 * shipped to the browser. `guide` replaces the how-to with bespoke content.
 */
export default function ToolPageSEO({ slug, guide }: { slug: string; guide?: ReactNode }) {
  const tool = getToolBySlug(slug);
  if (!tool) return null;

  const toolsUrl = `${SITE_URL}/tools`;
  const categoryHref = `/tools#${categoryAnchor(tool.category)}`;

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', url: SITE_URL },
    { name: 'PDF Tools', url: toolsUrl },
    { name: tool.category, url: `${SITE_URL}${categoryHref}` },
    { name: tool.name, url: `${toolsUrl}/${slug}` },
  ]);

  const faqs = getToolFaqs(slug);
  const howTo = getToolHowTo(slug);
  const guides = posts.filter((p) => p.tool === slug);
  const nextTools = getNextTools(slug, 4);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-4">
        <Breadcrumbs
          items={[
            { label: 'PDF Tools', href: '/tools' },
            { label: tool.category, href: categoryHref },
            { label: tool.name },
          ]}
        />
      </div>

      {guide ?? (
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">{howTo.title}</h2>
          <p className="text-gray-600 leading-relaxed mb-6">{howTo.intro}</p>
          <ol className="space-y-3 mb-8">
            {howTo.steps.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-sm font-semibold text-indigo-700">
                  {i + 1}
                </span>
                <span className="text-gray-700 leading-relaxed pt-0.5">{step}</span>
              </li>
            ))}
          </ol>

          <div className="rounded-2xl bg-gray-50 border border-border p-6">
            <h3 className="text-lg font-semibold text-foreground mb-3">Why use {tool.name} here?</h3>
            <ul className="space-y-2 text-gray-600">
              {howTo.benefits.map((b) => (
                <li key={b} className="flex items-start gap-2">
                  <span className="text-green-500 mt-1">✓</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* The FAQ is visible on the page, matching the FAQPage structured data. */}
      {faqs.length > 0 && (
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          <h2 className="text-2xl font-bold text-foreground mb-4">{tool.name} — frequently asked questions</h2>
          <div className="divide-y divide-border rounded-2xl border border-border bg-white">
            {faqs.map(f => (
              <details key={f.q} className="group px-5 py-4">
                <summary className="cursor-pointer list-none font-semibold text-foreground flex items-start justify-between gap-4">
                  {f.q}
                  <span className="text-muted-foreground transition-transform group-open:rotate-45 text-xl leading-none">+</span>
                </summary>
                <p className="mt-2 text-gray-600 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      )}

      {/* Guides about this tool: links the tool page into its blog cluster. */}
      {guides.length > 0 && (
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          <h2 className="text-xl font-bold text-foreground mb-4">{tool.name} guides</h2>
          <ul className="grid sm:grid-cols-2 gap-3">
            {guides.map((p) => (
              <li key={p.slug}>
                <Link
                  href={`/blog/${p.slug}`}
                  className="flex h-full items-start gap-3 rounded-xl border border-border bg-white p-4 hover:border-gray-300 hover:shadow-md transition-all"
                >
                  <BookOpenText className="w-4 h-4 mt-1 shrink-0 text-indigo-600" />
                  <span className="font-medium text-foreground leading-snug">{p.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {nextTools.length > 0 && (
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <h2 className="text-xl font-bold text-foreground mb-4">Continue with another tool</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {nextTools.map((t) => (
              <Link
                key={t.slug}
                href={`/tools/${t.slug}`}
                className="rounded-xl border border-border bg-white p-4 hover:border-gray-300 hover:shadow-md transition-all"
              >
                <p className="font-semibold text-foreground mb-1">{t.name}</p>
                <p className="text-sm text-gray-600 line-clamp-2">{t.description}</p>
              </Link>
            ))}
          </div>
          <Link
            href="/tools"
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:underline"
          >
            See all {tools.length} PDF tools <ArrowRight className="w-4 h-4" />
          </Link>
        </section>
      )}
    </>
  );
}
