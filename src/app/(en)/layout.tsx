import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getNav } from '@/i18n/nav';

/** Chrome for the English pages, which keep their original URLs. */
export default async function EnglishLayout({ children }: { children: React.ReactNode }) {
  const nav = await getNav('en');
  return (
    <>
      <Header nav={nav} />
      <main className="flex-1">{children}</main>
      <Footer nav={nav} />
    </>
  );
}
