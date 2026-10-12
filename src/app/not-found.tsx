import Link from 'next/link';
import type { Metadata } from 'next';
import { tools } from '@/lib/tools-data';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { getNav } from '@/i18n/nav';

export const metadata: Metadata = {
  title: 'Page Not Found',
  description: 'The page you are looking for does not exist. Browse our free PDF tools or read our guides.',
  robots: { index: false, follow: true },
};

export default async function NotFound() {
  const nav = await getNav('en');
  const popularTools = tools.filter((t) =>
    ['merge-pdf', 'compress-pdf', 'split-pdf', 'pdf-to-word', 'sign-pdf', 'edit-pdf'].includes(t.slug)
  );

  return (
    <>
    <Header nav={nav} />
    <main className="flex-1 min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-lg">
        <p className="text-6xl font-bold text-gray-200 mb-4">404</p>
        <h1 className="text-2xl font-bold text-foreground mb-3">Page not found</h1>
        <p className="text-gray-600 mb-8">
          The page you are looking for does not exist or has been moved.
          Try one of these popular tools instead:
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
          {popularTools.map((tool) => (
            <Link
              key={tool.slug}
              href={`/tools/${tool.slug}`}
              className="rounded-xl border border-border bg-white p-3 hover:border-gray-300 hover:shadow-md transition-all text-left"
            >
              <p className="font-semibold text-foreground text-sm">{tool.name}</p>
              <p className="text-xs text-gray-500 line-clamp-1">{tool.description}</p>
            </Link>
          ))}
        </div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-foreground text-white font-semibold rounded-xl hover:shadow-lg transition-all"
        >
          Go to Homepage
        </Link>
      </div>
    </main>
    <Footer nav={nav} />
    </>
  );
}
