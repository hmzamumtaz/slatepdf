import Link from 'next/link';
import { ArrowRight, BookOpenText } from 'lucide-react';
import Breadcrumbs from './Breadcrumbs';
import RateTool from './RateTool';
import type { ReactNode } from 'react';
import { categoryAnchor, getNextTools, getToolBySlug, tools } from '@/lib/tools-data';
import { getToolFaqs } from '@/lib/tool-seo';
import { getToolHowTo } from '@/lib/tool-howto';
import { posts } from '@/lib/blog';
import { generateBreadcrumbSchema, generateToolRatingSchema } from '@/lib/schema';
import { getPageRating, MIN_PUBLIC_VOTES } from '@/lib/ratings';
import { SITE_URL } from '@/lib/site';
import { DEFAULT_LOCALE, type AnyLocale } from '@/i18n/config';
import { categoryName, fill, getContent, toolContent } from '@/i18n/content';
import { homeHref, toolHref, toolsHubHref } from '@/i18n/paths';

/**
 * Server-rendered SEO content for tool pages: breadcrumbs, a tool-specific
 * how-to, the visible FAQ, guides about this tool, and next-step tools.
 * A server component on purpose — it reads blog data, which must never be
 * shipped to the browser. `guide` replaces the how-to with bespoke content.
 */
export default async function ToolPageSEO({ slug, guide, locale = DEFAULT_LOCALE }: { slug: string; guide?: ReactNode; locale?: AnyLocale }) {
  const tool = getToolBySlug(slug);
  if (!tool) return null;

  const english = locale === DEFAULT_LOCALE;
  const content = await getContent(locale);
  const site = content.site;
  const local = toolContent(content, slug);
  const name = local.name;
  const category = categoryName(content, tool.category);
  const hubHref = toolsHubHref(locale);
  const categoryHref = `${hubHref}#${categoryAnchor(tool.category)}`;
  const pageUrl = `${SITE_URL}${toolHref(locale, slug)}`;

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: site.breadcrumbHome, url: `${SITE_URL}${english ? '' : homeHref(locale)}` },
    { name: site.breadcrumbTools, url: `${SITE_URL}${hubHref}` },
    { name: category, url: `${SITE_URL}${categoryHref}` },
    { name, url: pageUrl },
  ]);

  // English reads the source modules; other languages read their content file.
  const faqs = english ? getToolFaqs(slug) : local.faqs;
  const howTo = english ? getToolHowTo(slug) : local.howTo;
  // Guides are English articles, so only the English page lists them.
  const guides = english ? posts.filter((p) => p.tool === slug) : [];
  const nextTools = getNextTools(slug, 4).map(t => ({ ...t, ...toolContent(content, t.slug), href: toolHref(locale, t.slug) }));
  // Prerendered and refreshed hourly; the widget also fetches the live figure.
  const rating = await getPageRating(slug);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      {rating.count >= MIN_PUBLIC_VOTES && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ ...generateToolRatingSchema({ ...tool, name, description: local.description }, rating), url: pageUrl }) }} />
      )}
      <RateTool slug={slug} toolName={name} initial={rating} />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-4">
        <Breadcrumbs
          home={{ label: site.breadcrumbHome, href: homeHref(locale) }}
          items={[
            { label: site.breadcrumbTools, href: hubHref },
            { label: category, href: categoryHref },
            { label: name },
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
            <h3 className="text-lg font-semibold text-foreground mb-3">{fill(site.whyToolHeading, { tool: name })}</h3>
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
          <h2 className="text-2xl font-bold text-foreground mb-4">{fill(site.faqHeading, { tool: name })}</h2>
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
          <h2 className="text-xl font-bold text-foreground mb-4">{site.continueHeading}</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {nextTools.map((t) => (
              <Link
                key={t.slug}
                href={t.href}
                className="rounded-xl border border-border bg-white p-4 hover:border-gray-300 hover:shadow-md transition-all"
              >
                <p className="font-semibold text-foreground mb-1">{t.name}</p>
                <p className="text-sm text-gray-600 line-clamp-2">{t.description}</p>
              </Link>
            ))}
          </div>
          <Link
            href={hubHref}
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:underline"
          >
            {fill(site.seeAllTools, { count: tools.length })} <ArrowRight className="w-4 h-4 rtl:rotate-180" />
          </Link>
        </section>
      )}
    </>
  );
}
