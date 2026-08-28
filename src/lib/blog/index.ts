import { allPosts } from './posts';
import { BLOG_CATEGORIES, readingMinutes, type BlogCategory, type BlogPost, type Author } from './types';
import { SITE_AUTHOR, postAuthor } from '../author';

export type { BlogPost, BlogCategory, Block, Faq, Author } from './types';
export { BLOG_CATEGORIES, readingMinutes } from './types';
export { SITE_AUTHOR, postAuthor } from '../author';

/** A published post guaranteed to carry an author and a reviewed date. */
export type EnrichedPost = BlogPost & { author: Author; reviewed: string };

/**
 * Every article carries the site-wide named author and a "reviewed" date
 * (defaulting to its update/publication date). This applies E-E-A-T metadata
 * across all posts from a single place, so source files stay clean.
 */
function enriched(post: BlogPost): EnrichedPost {
  const author = postAuthor(post);
  const reviewed = post.reviewed ?? post.updated ?? post.published;
  return { ...post, author, reviewed };
}

/** Newest first — the order the index and the sitemap use. */
export const posts: EnrichedPost[] = [...allPosts]
  .map(enriched)
  .sort((a, b) =>
    (b.updated ?? b.published).localeCompare(a.updated ?? a.published) || a.slug.localeCompare(b.slug),
  );

const bySlug = new Map(posts.map(p => [p.slug, p]));

export function getPost(slug: string): EnrichedPost | undefined {
  return bySlug.get(slug);
}

export function postsByCategory(category: BlogCategory): BlogPost[] {
  return posts.filter(p => p.category === category);
}

export function categoriesInUse(): BlogCategory[] {
  return BLOG_CATEGORIES.filter(c => posts.some(p => p.category === c));
}

/**
 * Articles to link at the foot of a post. Explicit picks win; the rest is
 * filled from the same category, then from articles about the same tool, so
 * every page has outbound links a crawler can follow.
 */
export function relatedPosts(post: BlogPost, count = 3): BlogPost[] {
  const out: BlogPost[] = [];
  const seen = new Set([post.slug]);

  const push = (p?: BlogPost) => {
    if (p && !seen.has(p.slug) && out.length < count) {
      seen.add(p.slug);
      out.push(p);
    }
  };

  for (const slug of post.related ?? []) push(bySlug.get(slug));
  for (const p of posts) if (p.category === post.category) push(p);
  if (post.tool) for (const p of posts) if (p.tool === post.tool) push(p);
  for (const p of posts) push(p);

  return out;
}

export function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
  });
}

export function postSummary(post: BlogPost) {
  return { ...post, minutes: readingMinutes(post) };
}
