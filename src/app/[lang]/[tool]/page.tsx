import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ToolPageSEO from '@/components/ToolPageSEO';
import { toolComponents } from '@/components/tools/registry';
import { I18nProvider } from '@/i18n/I18nProvider';
import { LOCALES, OG_LOCALES, isLocale, type Locale } from '@/i18n/config';
import { getContent, toolContent, toolMessages } from '@/i18n/content';
import { languageAlternates } from '@/i18n/alternates';
import { toolOgImage } from '@/i18n/og';
import { localizedSlug, slugFromLocalized, toolHref } from '@/i18n/paths';
import { generateFAQSchema } from '@/lib/schema';
import { SITE_NAME, SITE_URL, pageTitle } from '@/lib/site';
import { tools } from '@/lib/tools-data';

export const dynamicParams = false;

export function generateStaticParams() {
  return LOCALES.flatMap(lang => tools.map(t => ({ lang, tool: localizedSlug(lang, t.slug) })));
}

async function resolve(params: Promise<{ lang: string; tool: string }>) {
  const { lang, tool } = await params;
  if (!isLocale(lang)) notFound();
  const slug = slugFromLocalized(lang, decodeURIComponent(tool));
  if (!slug || !toolComponents[slug]) notFound();
  return { lang: lang as Locale, slug };
}

export async function generateMetadata({ params }: PageProps<'/[lang]/[tool]'>): Promise<Metadata> {
  const { lang, slug } = await resolve(params);
  const local = toolContent(await getContent(lang), slug);
  const url = toolHref(lang, slug);
  return {
    title: pageTitle(local.seoTitle),
    description: local.metaDescription,
    alternates: { canonical: url, languages: languageAlternates({ kind: 'tool', slug }) },
    openGraph: {
      type: 'website',
      locale: OG_LOCALES[lang],
      title: local.seoTitle,
      description: local.metaDescription,
      url,
      siteName: SITE_NAME,
      images: [{ url: toolOgImage(lang, slug), width: 1200, height: 630, alt: `${SITE_NAME} — ${local.name}` }],
    },
    twitter: { card: 'summary_large_image', title: local.seoTitle, description: local.metaDescription, images: [toolOgImage(lang, slug)] },
  };
}

export default async function LocalizedToolPage({ params }: PageProps<'/[lang]/[tool]'>) {
  const { lang, slug } = await resolve(params);
  const local = toolContent(await getContent(lang), slug);
  const messages = await toolMessages(lang, slug);
  const Tool = toolComponents[slug];

  const pageSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `${local.name} — ${SITE_NAME}`,
    description: local.metaDescription,
    url: `${SITE_URL}${toolHref(lang, slug)}`,
    inLanguage: lang,
    isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE_URL },
  };
  const faqSchema = generateFAQSchema(local.faqs);

  return (
    <I18nProvider locale={lang} messages={messages}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pageSchema) }} />
      {faqSchema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />}
      <Tool />
      <ToolPageSEO slug={slug} locale={lang} />
    </I18nProvider>
  );
}
