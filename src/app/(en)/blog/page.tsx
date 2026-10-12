import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowRight } from 'lucide-react';
import { posts, categoriesInUse, readingMinutes, formatDate } from '@/lib/blog';
import { SITE_NAME, SITE_URL } from '@/lib/site';
import BlogExplorer, { type BlogCard } from '@/components/blog/BlogExplorer';

const TITLE = 'PDF Guides and How-Tos';
const DESCRIPTION =
  'Practical guides to merging, splitting, converting, compressing, signing and securing PDF files — written for people who just need the job done.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/blog' },
  openGraph: {
    type: 'website',
    title: TITLE,
    description: DESCRIPTION,
    url: '/blog',
    siteName: SITE_NAME,
    images: [{ url: `${SITE_URL}/og-home.png`, width: 1200, height: 630, alt: `${SITE_NAME} — PDF Guides and How-Tos` }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: [`${SITE_URL}/og-home.png`],
  },
};

export default function BlogIndexPage() {
  const categories = categoriesInUse();
  const [featured, ...rest] = posts;
  const cards: BlogCard[] = rest.map((post) => ({
    slug: post.slug,
    title: post.title,
    description: post.description,
    category: post.category,
    date: formatDate(post.updated ?? post.published),
    minutes: readingMinutes(post),
  }));

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: `${SITE_NAME} — ${TITLE}`,
    description: DESCRIPTION,
    url: `${SITE_URL}/blog`,
    publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
  };

  return (
    <div className="bg-gray-50/50">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <header className="max-w-2xl mb-10">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground mb-4">{TITLE}</h1>
          <p className="text-lg text-gray-600 leading-relaxed">{DESCRIPTION}</p>
          <p className="text-sm text-muted-foreground mt-4">{posts.length} articles</p>
        </header>

        {featured && (
          <section className="mb-12">
            <Link
              href={`/blog/${featured.slug}`}
              className="block rounded-2xl bg-black text-white p-7 sm:p-10 hover:shadow-xl transition-shadow"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
                Latest · {featured.category}
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold leading-tight mb-3">{featured.title}</h2>
              <p className="text-gray-300 leading-relaxed max-w-2xl mb-5">{featured.description}</p>
              <span className="inline-flex items-center gap-2 text-sm font-semibold">
                Read the guide <ArrowRight className="w-4 h-4" />
              </span>
            </Link>
          </section>
        )}

        <BlogExplorer cards={cards} categories={categories} />
      </div>
    </div>
  );
}
