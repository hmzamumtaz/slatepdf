import type { Metadata } from 'next';
import Link from 'next/link';
import ToolGrid from '@/components/ToolGrid';
import Breadcrumbs from '@/components/Breadcrumbs';
import { categories, categoryAnchor, categoryBlurbs, getToolsByCategory, tools } from '@/lib/tools-data';
import { SITE_NAME, SITE_URL, pageTitle } from '@/lib/site';
import { generateBreadcrumbSchema } from '@/lib/schema';

const TITLE = `All PDF Tools — ${tools.length} Free Tools, No Upload`;
const DESCRIPTION = `Every ${SITE_NAME} tool in one place: merge, split, compress, convert, edit, sign and protect PDFs. Free, no account, and your files never leave your browser.`;

export const metadata: Metadata = {
  title: pageTitle(TITLE),
  description: DESCRIPTION,
  alternates: { canonical: '/tools' },
  openGraph: {
    type: 'website',
    title: TITLE,
    description: DESCRIPTION,
    url: '/tools',
    siteName: SITE_NAME,
    images: [{ url: `${SITE_URL}/og-home.png`, width: 1200, height: 630, alt: `${SITE_NAME} — all PDF tools` }],
  },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION, images: [`${SITE_URL}/og-home.png`] },
};

export default function ToolsIndexPage() {
  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: TITLE,
    description: DESCRIPTION,
    url: `${SITE_URL}/tools`,
    isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE_URL },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: tools.length,
      itemListElement: tools.map((t, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: t.name,
        url: `${SITE_URL}/tools/${t.slug}`,
      })),
    },
  };
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', url: SITE_URL },
    { name: 'PDF Tools', url: `${SITE_URL}/tools` },
  ]);

  return (
    <div className="bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-10">
        <Breadcrumbs items={[{ label: 'PDF Tools' }]} />
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground text-balance">
          Every PDF tool you need, in one place
        </h1>
        <p className="mt-4 max-w-3xl text-lg text-gray-600 leading-relaxed">
          {tools.length} free PDF tools to merge, split, compress, convert, edit, sign and protect your documents.
          Each one runs in your browser, so your files are never uploaded — no account, no watermark.
        </p>
        <nav aria-label="Tool categories" className="mt-6 flex flex-wrap gap-2">
          {categories.map((c) => (
            <a
              key={c}
              href={`#${categoryAnchor(c)}`}
              className="px-3 py-1.5 rounded-full border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-gray-300 transition-colors"
            >
              {c}
            </a>
          ))}
        </nav>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {categories.map((category) => (
          <div key={category} id={categoryAnchor(category)} className="mb-14 last:mb-0 scroll-mt-24">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">{category}</h2>
            <p className="mt-1 mb-5 text-gray-600">{categoryBlurbs[category]}</p>
            <ToolGrid tools={getToolsByCategory(category)} />
          </div>
        ))}
      </section>

      <section className="bg-gray-50 border-t border-border py-14">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-foreground mb-3">Not sure which tool you need?</h2>
          <p className="text-gray-600 leading-relaxed">
            Our <Link href="/blog" className="font-medium text-indigo-600 hover:underline">PDF guides</Link> walk
            through common jobs step by step — shrinking a file for email, signing a form, turning a scan into
            searchable text. Or open the <Link href="/tools/pdf-workspace" className="font-medium text-indigo-600 hover:underline">PDF Workspace</Link> to
            edit, sign, redact and protect one document without switching pages.
          </p>
        </div>
      </section>
    </div>
  );
}
