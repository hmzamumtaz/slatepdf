import { notFound } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { LOCALES, dirFor, isLocale } from '@/i18n/config';
import { getNav } from '@/i18n/nav';

export const dynamicParams = false;

export function generateStaticParams() {
  return LOCALES.map(lang => ({ lang }));
}

/**
 * Chrome for translated pages (/es, /fr, …). The root layout's <html> says
 * lang="en", so this marks the content with its real language and direction,
 * and corrects the <html> attributes as soon as the page loads.
 */
export default async function LocaleLayout({ children, params }: LayoutProps<'/[lang]'>) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const nav = await getNav(lang);
  const dir = dirFor(lang);
  return (
    <div lang={lang} dir={dir} className="flex-1 flex flex-col">
      <script
        dangerouslySetInnerHTML={{ __html: `document.documentElement.lang=${JSON.stringify(lang)};document.documentElement.dir=${JSON.stringify(dir)};` }}
      />
      <Header nav={nav} />
      <main className="flex-1">{children}</main>
      <Footer nav={nav} />
    </div>
  );
}
