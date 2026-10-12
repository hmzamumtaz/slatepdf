import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ToolGrid from '@/components/ToolGrid';
import Breadcrumbs from '@/components/Breadcrumbs';
import { OG_LOCALES, isLocale, type Locale } from '@/i18n/config';
import { categoryBlurb, categoryName, fill, getContent } from '@/i18n/content';
import { getNav } from '@/i18n/nav';
import { languageAlternates } from '@/i18n/alternates';
import { homeHref, toolsHubHref } from '@/i18n/paths';
import { categoryAnchor, tools } from '@/lib/tools-data';
import { generateBreadcrumbSchema } from '@/lib/schema';
import { SITE_NAME, SITE_URL, pageTitle } from '@/lib/site';

async function localeFrom(params: Promise<{ lang: string }>): Promise<Locale> {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return lang;
}

export async function generateMetadata({ params }: PageProps<'/[lang]/tools'>): Promise<Metadata> {
  const lang = await localeFrom(params);
  const { site } = await getContent(lang);
  const title = fill(site.hubTitle, { count: tools.length });
  const description = fill(site.hubDescription);
  const url = toolsHubHref(lang);
  return {
    title: pageTitle(title),
    description,
    alternates: { canonical: url, languages: languageAlternates({ kind: 'hub' }) },
    openGraph: { type: 'website', locale: OG_LOCALES[lang], title, description, url, siteName: SITE_NAME, images: [{ url: `${SITE_URL}/og-home.png`, width: 1200, height: 630, alt: SITE_NAME }] },
    twitter: { card: 'summary_large_image', title, description, images: [`${SITE_URL}/og-home.png`] },
  };
}

export default async function LocalizedToolsHub({ params }: PageProps<'/[lang]/tools'>) {
  const lang = await localeFrom(params);
  const content = await getContent(lang);
  const { site } = content;
  const nav = await getNav(lang);
  const hub = toolsHubHref(lang);

  const collectionSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: fill(site.hubTitle, { count: tools.length }),
    description: fill(site.hubDescription),
    url: `${SITE_URL}${hub}`,
    inLanguage: lang,
    isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE_URL },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: tools.length,
      itemListElement: nav.categories.flatMap(c => c.tools).map((t, i) => ({
        '@type': 'ListItem', position: i + 1, name: t.name, url: `${SITE_URL}${t.href}`,
      })),
    },
  };
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: site.breadcrumbHome, url: `${SITE_URL}${homeHref(lang)}` },
    { name: site.breadcrumbTools, url: `${SITE_URL}${hub}` },
  ]);

  return (
    <div className="bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-10">
        <Breadcrumbs home={{ label: site.breadcrumbHome, href: homeHref(lang) }} items={[{ label: site.breadcrumbTools }]} />
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground text-balance">{site.hubH1}</h1>
        <p className="mt-4 max-w-3xl text-lg text-gray-600 leading-relaxed">{fill(site.hubIntro, { count: tools.length })}</p>
        <nav aria-label={site.breadcrumbTools} className="mt-6 flex flex-wrap gap-2">
          {nav.categories.map(c => (
            <a
              key={c.id}
              href={`#${categoryAnchor(c.id)}`}
              className="px-3 py-1.5 rounded-full border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-gray-300 transition-colors"
            >
              {c.label}
            </a>
          ))}
        </nav>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {nav.categories.map(c => (
          <div key={c.id} id={categoryAnchor(c.id)} className="mb-14 last:mb-0 scroll-mt-24">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">{categoryName(content, c.id)}</h2>
            <p className="mt-1 mb-5 text-gray-600">{categoryBlurb(content, c.id)}</p>
            <ToolGrid tools={c.tools} />
          </div>
        ))}
      </section>
    </div>
  );
}
