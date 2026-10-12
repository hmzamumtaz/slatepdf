import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, Shield } from 'lucide-react';
import ToolGrid from '@/components/ToolGrid';
import { OG_LOCALES, isLocale, type Locale } from '@/i18n/config';
import { fill, getContent } from '@/i18n/content';
import { getNav } from '@/i18n/nav';
import { languageAlternates } from '@/i18n/alternates';
import { homeHref, toolsHubHref } from '@/i18n/paths';
import { categoryAnchor, tools } from '@/lib/tools-data';
import { generateFAQSchema } from '@/lib/schema';
import { SITE_NAME, SITE_URL } from '@/lib/site';

const POPULAR = ['merge-pdf', 'compress-pdf', 'jpg-to-pdf', 'pdf-to-word', 'sign-pdf', 'edit-pdf'];

async function localeFrom(params: Promise<{ lang: string }>): Promise<Locale> {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  return lang;
}

export async function generateMetadata({ params }: PageProps<'/[lang]'>): Promise<Metadata> {
  const lang = await localeFrom(params);
  const { site } = await getContent(lang);
  const title = `${SITE_NAME} — ${site.homeTitle}`;
  const description = fill(site.homeDescription);
  const url = homeHref(lang);
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url, languages: languageAlternates({ kind: 'home' }) },
    openGraph: { type: 'website', locale: OG_LOCALES[lang], title, description, url, siteName: SITE_NAME, images: [{ url: `${SITE_URL}/og-home.png`, width: 1200, height: 630, alt: SITE_NAME }] },
    twitter: { card: 'summary_large_image', title, description, images: [`${SITE_URL}/og-home.png`] },
  };
}

export default async function LocalizedHome({ params }: PageProps<'/[lang]'>) {
  const lang = await localeFrom(params);
  const { site } = await getContent(lang);
  const nav = await getNav(lang);
  const allTools = nav.categories.flatMap(c => c.tools);
  const popular = POPULAR.map(slug => allTools.find(t => t.slug === slug)!);
  const faqs = site.homeFaqs.map(f => ({ q: fill(f.q), a: fill(f.a) }));

  const toolListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${SITE_NAME} PDF`,
    numberOfItems: tools.length,
    itemListElement: allTools.map((t, i) => ({ '@type': 'ListItem', position: i + 1, name: t.name, url: `${SITE_URL}${t.href}` })),
  };
  const faqSchema = generateFAQSchema(faqs);

  return (
    <div className="bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(toolListSchema) }} />
      {faqSchema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />}

      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-24 pb-12 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-green-50 border border-green-200 rounded-full text-sm font-medium text-green-800">
          <Shield className="w-4 h-4 text-green-600" />
          <span>{site.heroBadge}</span>
        </div>
        <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] text-foreground text-balance">
          {site.heroTitle}
          <span className="mt-3 block w-fit mx-auto bg-foreground text-white px-4 sm:px-5 rounded-xl leading-snug">{site.heroHighlight}</span>
        </h1>
        <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">{site.heroSubtitle}</p>
        <Link
          href={toolsHubHref(lang)}
          className="mt-9 inline-flex items-center justify-center gap-2.5 px-8 py-4 bg-foreground text-white font-bold rounded-2xl hover:bg-[#27272a] transition-all"
        >
          {site.heroCta} <ArrowRight className="w-5 h-5 rtl:rotate-180" />
        </Link>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <h2 className="text-xl font-bold text-foreground mb-5">{site.popularTools}</h2>
        <ToolGrid tools={popular} />
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {nav.categories.map(c => (
          <div key={c.id} id={categoryAnchor(c.id)} className="mb-12 last:mb-0">
            <h2 className="text-xl font-bold text-foreground mb-5">{c.label}</h2>
            <ToolGrid tools={c.tools} />
          </div>
        ))}
      </section>

      <section className="bg-gray-50 border-y border-border py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold mb-10 text-center text-foreground">{fill(site.whyTitle)}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {site.why.map(item => (
              <div key={item.title} className="p-8 rounded-2xl border border-border bg-white">
                <h3 className="text-lg font-bold mb-2 text-foreground">{item.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold mb-8 text-center text-foreground">{site.faqTitle}</h2>
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
        </div>
      </section>
    </div>
  );
}
