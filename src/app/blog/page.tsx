import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowRight, Clock } from 'lucide-react';
import { posts, categoriesInUse, postsByCategory, readingMinutes, formatDate } from '@/lib/blog';
import { SITE_NAME, SITE_URL } from '@/lib/site';

const TITLE = 'PDF Guides and How-Tos';
const DESCRIPTION =
  'Practical guides to merging, splitting, converting, compressing, signing and securing PDF files — written for people who just need the job done.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/blog' },
  openGraph: { type: 'website', title: TITLE, description: DESCRIPTION, url: '/blog', siteName: SITE_NAME },
  twitter: { card: 'summary', title: TITLE, description: DESCRIPTION },
};

export default function BlogIndexPage() {
  const categories = categoriesInUse();
  const [featured, ...rest] = posts;
  const recent = rest.slice(0, 5);

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
        <header className="max-w-2xl mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground mb-4">{TITLE}</h1>
          <p className="text-lg text-gray-600 leading-relaxed">{DESCRIPTION}</p>
          <p className="text-sm text-muted-foreground mt-4">{posts.length} articles</p>
        </header>

        {featured && (
          <section className="mb-14">
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

        {recent.length > 0 && (
          <section className="mb-14">
            <h2 className="text-xl font-bold text-foreground mb-5">Recently updated</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {recent.map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="rounded-2xl border border-border bg-white p-5 hover:border-gray-300 hover:shadow-md transition-all flex flex-col"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{post.category}</p>
                  <h3 className="font-bold text-foreground leading-snug mb-2">{post.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed line-clamp-3 flex-1">{post.description}</p>
                  <p className="text-xs text-muted-foreground mt-4 inline-flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    {readingMinutes(post)} min · {formatDate(post.updated ?? post.published)}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {categories.map((category) => (
          <section key={category} className="mb-12">
            <h2 className="text-xl font-bold text-foreground mb-1">{category}</h2>
            <p className="text-sm text-muted-foreground mb-4">{postsByCategory(category).length} articles</p>
            <ul className="grid sm:grid-cols-2 gap-x-8 gap-y-1 border-t border-border pt-2">
              {postsByCategory(category).map((post) => (
                <li key={post.slug} className="border-b border-border last:border-0">
                  <Link
                    href={`/blog/${post.slug}`}
                    className="flex items-baseline justify-between gap-4 py-3 group"
                  >
                    <span className="text-[15px] text-gray-700 group-hover:text-foreground transition-colors">
                      {post.title}
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0">{readingMinutes(post)} min</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
