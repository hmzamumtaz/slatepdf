/** The content model every article is written against. */

export type Block =
  | { type: 'p'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'steps'; items: string[] }
  | { type: 'list'; items: string[] }
  | { type: 'table'; head: string[]; rows: string[][] }
  | { type: 'callout'; title: string; text: string };

export interface Faq {
  q: string;
  a: string;
}

/**
 * A named, human author for the site's articles. Publishing every post under
 * a real byline is a core E-E-A-T signal (Expertise + Trustworthiness).
 */
export interface Author {
  /** Display name, e.g. "Hamza M.". */
  name: string;
  /** Short role e.g. "PDF Workflow Editor". */
  role: string;
  /** 1-2 sentence bio shown under the byline. */
  bio: string;
  /** Link to the author's About page or profile. */
  url?: string;
}

export const BLOG_CATEGORIES = [
  'Merging & Organizing',
  'Converting',
  'Compressing',
  'Security & Privacy',
  'Editing & Signing',
  'Troubleshooting',
] as const;

export type BlogCategory = (typeof BLOG_CATEGORIES)[number];

export interface BlogPost {
  /** URL segment. Keep it short, hyphenated and keyword-led. */
  slug: string;
  /** The <h1> and the <title>. Lead with the search phrase. */
  title: string;
  /** The meta description — aim for 140–160 characters. */
  description: string;
  /** The search phrase this article is written for. */
  keyword: string;
  category: BlogCategory;
  published: string;
  updated?: string;
  /** ISO date of the last human fact-check / editorial review. */
  reviewed?: string;
  /** Optional named author override. Falls back to the site-wide author. */
  author?: Author;
  /** Optional first-person "I've actually done this" note for Experience. */
  experience?: string;
  /** Slug of the tool the article sends readers to. */
  tool?: string;
  blocks: Block[];
  faqs: Faq[];
  /** Slugs of articles to surface at the end. Filled in automatically when omitted. */
  related?: string[];
}

/** Plain text of an article, used for the reading-time estimate. */
export function postText(post: BlogPost): string {
  const parts: string[] = [post.description];
  for (const b of post.blocks) {
    switch (b.type) {
      case 'p':
      case 'h2':
      case 'h3':
        parts.push(b.text);
        break;
      case 'steps':
      case 'list':
        parts.push(b.items.join(' '));
        break;
      case 'table':
        parts.push(b.head.join(' '), b.rows.map(r => r.join(' ')).join(' '));
        break;
      case 'callout':
        parts.push(b.title, b.text);
        break;
    }
  }
  for (const f of post.faqs) parts.push(f.q, f.a);
  return parts.join(' ');
}

export function readingMinutes(post: BlogPost): number {
  const words = postText(post).split(/\s+/).filter(Boolean).length;
  return Math.max(2, Math.round(words / 225));
}
