import { ALL_LOCALES, DEFAULT_LOCALE } from './config';
import { hrefFor, type PageKey } from './paths';
import { SITE_URL } from '@/lib/site';

/**
 * hreflang alternates for a page that exists in every language: one entry
 * per language plus x-default (English). Every version of the page must
 * list the same set, including itself, or Google ignores the annotations.
 */
export function languageAlternates(page: PageKey): Record<string, string> {
  const out: Record<string, string> = {};
  for (const locale of ALL_LOCALES) out[locale] = `${SITE_URL}${hrefFor(locale, page)}`;
  out['x-default'] = `${SITE_URL}${hrefFor(DEFAULT_LOCALE, page)}`;
  return out;
}
