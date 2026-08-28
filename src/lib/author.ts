import { SITE_URL } from './site';
import type { Author, BlogPost } from './blog/types';

/**
 * Site-wide default author. Every article is published under a named,
 * human byline — a core E-E-A-T (Trustworthiness + Expertise) signal.
 * Individual posts can override via their `author` field.
 */
export const SITE_AUTHOR: Author = {
  name: 'Hamza M.',
  role: 'PDF Workflow Editor',
  bio: 'Hamza has spent a decade working with print and digital documents — from prepress production to everyday PDF cleanup — and now writes practical, tested guides for Slate PDF.',
  url: `${SITE_URL}/about`,
};

/** Contact email for the site / author (shown on the About page). */
export const SITE_EMAIL = 'hmza.mumtaz1@gmail.com';

/** Resolve the effective author for a post (post-level override wins). */
export function postAuthor(post: BlogPost): Author {
  return post.author ?? SITE_AUTHOR;
}
