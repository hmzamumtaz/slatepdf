'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import Breadcrumbs from './Breadcrumbs';
import { getToolBySlug, tools } from '@/lib/tools-data';
import { SITE_URL } from '@/lib/site';

/** Client-side SEO wrapper for tool pages. Adds breadcrumbs, related tools, and SEO content. */
export default function ToolPageSEO({ slug }: { slug: string }) {
  const pathname = usePathname();
  const tool = getToolBySlug(slug);
  if (!tool) return null;

  const toolUrl = `${SITE_URL}/tools/${slug}`;

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: tool.name, item: toolUrl },
    ],
  };

  const relatedTools = tools
    .filter((t) => t.slug !== slug && t.category === tool.category)
    .slice(0, 4);

  const moreTools = tools
    .filter((t) => t.slug !== slug && t.category !== tool.category)
    .slice(0, 6);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      {/* Breadcrumbs */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-4">
        <Breadcrumbs
          items={[
            { label: tool.category, href: '/' },
            { label: tool.name },
          ]}
        />
      </div>

      {/* SEO content below the tool */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
          {tool.name} — Free Online Tool
        </h2>
        <p className="text-gray-600 leading-relaxed mb-6">
          {tool.description}. This tool runs entirely in your browser — your files are never uploaded to any server.
          No sign-up required, no watermarks, no file size limits. Works on Windows, Mac, Linux, iPhone, and Android.
        </p>

        <h3 className="text-lg font-semibold text-foreground mt-8 mb-3">How to use {tool.name}</h3>
        <ol className="list-decimal list-inside space-y-2 text-gray-600 mb-6">
          <li>Open this page in any modern browser (Chrome, Firefox, Safari, Edge)</li>
          <li>Drop your file(s) into the upload area or click to browse</li>
          <li>Adjust any settings if available</li>
          <li>Click the process button and download your result</li>
        </ol>

        <div className="rounded-2xl bg-gray-50 border border-border p-6 mt-8">
          <h3 className="text-lg font-semibold text-foreground mb-3">Why choose {tool.name}?</h3>
          <ul className="space-y-2 text-gray-600">
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-1">✓</span>
              <span><strong>100% private</strong> — files are processed in your browser, never uploaded</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-1">✓</span>
              <span><strong>Completely free</strong> — no sign-up, no watermarks, no limits</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-1">✓</span>
              <span><strong>Instant processing</strong> — no server queues, no waiting</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500 mt-1">✓</span>
              <span><strong>Works everywhere</strong> — Windows, Mac, Linux, iOS, Android</span>
            </li>
          </ul>
        </div>
      </section>

      {/* Related tools in same category */}
      {relatedTools.length > 0 && (
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
          <h3 className="text-xl font-bold text-foreground mb-4">Related tools</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {relatedTools.map((t) => (
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
        </section>
      )}

      {/* More tools from other categories */}
      {moreTools.length > 0 && (
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <h3 className="text-xl font-bold text-foreground mb-4">More PDF tools</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {moreTools.map((t) => (
              <Link
                key={t.slug}
                href={`/tools/${t.slug}`}
                className="flex items-center gap-3 rounded-xl border border-border bg-white p-4 hover:border-gray-300 hover:shadow-md transition-all"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-foreground">{t.name}</p>
                  <p className="text-sm text-gray-600 truncate">{t.description}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
