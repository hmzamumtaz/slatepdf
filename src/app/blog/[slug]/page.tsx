import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ArrowLeft, ArrowRight, Clock, Calendar } from 'lucide-react';
import BlogBody, { slugifyHeading } from '@/components/BlogBody';
import { getPost, posts, relatedPosts, readingMinutes, formatDate } from '@/lib/blog';
import { SITE_AUTHOR, postAuthor } from '@/lib/author';
import { getToolBySlug } from '@/lib/tools-data';
import { SITE_NAME, SITE_URL } from '@/lib/site';

export function generateStaticParams() {
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};

  const url = `/blog/${post.slug}`;
  return {
    title: post.title,
    description: post.description,
    keywords: [post.keyword],
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      title: post.title,
      description: post.description,
      url,
      siteName: SITE_NAME,
      publishedTime: post.published,
      modifiedTime: post.updated ?? post.published,
    },
    twitter: { card: 'summary', title: post.title, description: post.description },
  };
}

export default async function BlogArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const minutes = readingMinutes(post);
  const related = relatedPosts(post);
  const tool = post.tool ? getToolBySlug(post.tool) : undefined;
  const headings = post.blocks.filter((b) => b.type === 'h2').map((b) => (b as { text: string }).text);
  const url = `${SITE_URL}/blog/${post.slug}`;

  const author = postAuthor(post);
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    datePublished: post.published,
    dateModified: post.updated ?? post.published,
    dateReviewed: post.reviewed,
    inLanguage: 'en',
    articleSection: post.category,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    author: { '@type': 'Person', name: author.name, url: author.url ?? SITE_URL },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/logo.svg` },
    },
  };

  const faqSchema = post.faqs.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: post.faqs.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      }
    : null;

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_URL}/blog` },
      { '@type': 'ListItem', position: 3, name: post.title, item: url },
    ],
  };

  const personSchema = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: author.name,
    jobTitle: author.role,
    description: author.bio,
    url: author.url ?? SITE_URL,
    knowsAbout: ['PDF', 'Document management', 'File formats', 'Digital signatures'],
    worksFor: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
  };

  return (
    <div className="bg-gray-50/50">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }} />
      {faqSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      )}

      <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <nav aria-label="Breadcrumb" className="mb-6">
          <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
            <li><Link href="/" className="hover:text-foreground transition-colors">Home</Link></li>
            <li aria-hidden>/</li>
            <li><Link href="/blog" className="hover:text-foreground transition-colors">Blog</Link></li>
            <li aria-hidden>/</li>
            <li className="text-foreground truncate max-w-[16rem]">{post.category}</li>
          </ol>
        </nav>

        <header className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">{post.category}</p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground leading-tight mb-4">{post.title}</h1>
          <p className="text-lg text-gray-600 leading-relaxed mb-5">{post.description}</p>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center font-bold text-base shrink-0">
              {author.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-foreground">{author.name}</p>
              <p className="text-xs text-muted-foreground">{author.role}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground border-t border-border pt-4">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              {post.updated ? `Updated ${formatDate(post.updated)}` : formatDate(post.published)}
            </span>
            <span className="inline-flex items-center gap-1.5"><Clock className="w-4 h-4" />{minutes} min read</span>
            <span className="inline-flex items-center gap-1.5" title="Last independently reviewed for accuracy">
              <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
                Reviewed {formatDate(post.reviewed)}
              </span>
            </span>
          </div>
        </header>

        {headings.length > 2 && (
          <nav aria-label="On this page" className="mb-10 rounded-2xl border border-border bg-white p-5">
            <p className="text-sm font-semibold text-foreground mb-3">On this page</p>
            <ul className="space-y-2">
              {headings.map((h) => (
                <li key={h}>
                  <a href={`#${slugifyHeading(h)}`} className="text-sm text-gray-600 hover:text-foreground transition-colors">
                    {h}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}

        <BlogBody blocks={post.blocks} />

        {tool && (
          <div className="mt-12 rounded-2xl bg-black text-white p-6 sm:p-8">
            <p className="text-sm text-gray-400 mb-2">Do it now</p>
            <h2 className="text-xl font-bold mb-2">{tool.name}</h2>
            <p className="text-gray-300 mb-5 leading-relaxed">
              {tool.description}. It runs in this browser tab — your file is not uploaded anywhere.
            </p>
            <Link
              href={`/tools/${tool.slug}`}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-black font-semibold text-sm hover:bg-gray-100 transition-colors"
            >
              Open {tool.name}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {post.faqs.length > 0 && (
          <section className="mt-12">
            <h2 id="faq" className="text-2xl font-bold text-foreground mb-5 scroll-mt-24">Frequently asked questions</h2>
            <div className="space-y-3">
              {post.faqs.map((faq) => (
                <details key={faq.q} className="group rounded-xl border border-border bg-white px-5 py-4">
                  <summary className="cursor-pointer font-semibold text-foreground list-none flex items-center justify-between gap-4">
                    {faq.q}
                    <span className="text-muted-foreground text-xl leading-none group-open:rotate-45 transition-transform">+</span>
                  </summary>
                  <p className="mt-3 text-gray-700 leading-relaxed">{faq.a}</p>
                </details>
              ))}
            </div>
          </section>
        )}

        {related.length > 0 && (
          <section className="mt-12 border-t border-border pt-8">
            <h2 className="text-lg font-bold text-foreground mb-4">Keep reading</h2>
            <div className="grid sm:grid-cols-3 gap-4">
              {related.map((r) => (
                <Link
                  key={r.slug}
                  href={`/blog/${r.slug}`}
                  className="rounded-xl border border-border bg-white p-4 hover:border-gray-300 hover:shadow-sm transition-all"
                >
                  <p className="text-xs text-muted-foreground mb-1.5">{r.category}</p>
                  <p className="text-sm font-semibold text-foreground leading-snug">{r.title}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        <div className="mt-10">
          <Link href="/blog" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            All articles
          </Link>
        </div>

        <footer className="mt-12 border-t border-border pt-8 flex gap-4">
          <div className="w-12 h-12 rounded-full bg-black text-white flex items-center justify-center font-bold text-lg shrink-0">
            {author.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{author.name} · {author.role}</p>
            <p className="text-sm text-gray-600 leading-relaxed mt-1">{author.bio}</p>
            <p className="text-sm mt-2">
              <Link href="/about" className="font-medium text-foreground underline underline-offset-2 hover:opacity-70">
                Read more about how this site is run
              </Link>
            </p>
          </div>
        </footer>
      </article>
    </div>
  );
}
