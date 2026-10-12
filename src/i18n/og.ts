import { DEFAULT_LOCALE, type AnyLocale } from './config';
import { SITE_URL } from '@/lib/site';

/**
 * Languages with their own tool share images: those whose scripts the bundled
 * font (DejaVu Sans) covers and the renderer can lay out. Others (Arabic,
 * Hebrew, CJK, Thai, Indic scripts) use the English image.
 */
export const IMAGE_LOCALES: AnyLocale[] = [
  'en', 'es', 'pt', 'fr', 'de', 'it', 'id', 'ru',
  'tr', 'nl', 'pl', 'vi', 'uk', 'sv', 'cs', 'ro', 'hu', 'el', 'ms', 'da', 'fi', 'nb',
];

/** Absolute URL of a tool's 1200×630 share image for a page in `locale`. */
export function toolOgImage(locale: AnyLocale, slug: string): string {
  const lang = IMAGE_LOCALES.includes(locale) ? locale : DEFAULT_LOCALE;
  return `${SITE_URL}/og/${lang}/${slug}`;
}
