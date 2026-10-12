import { DEFAULT_LOCALE, type AnyLocale } from './config';
import { SITE_URL } from '@/lib/site';

/**
 * Languages with their own tool share images. The image renderer cannot join
 * Arabic letters, so Arabic pages use the English image.
 */
export const IMAGE_LOCALES: AnyLocale[] = ['en', 'es', 'pt', 'fr', 'de', 'it', 'id', 'ru'];

/** Absolute URL of a tool's 1200×630 share image for a page in `locale`. */
export function toolOgImage(locale: AnyLocale, slug: string): string {
  const lang = IMAGE_LOCALES.includes(locale) ? locale : DEFAULT_LOCALE;
  return `${SITE_URL}/og/${lang}/${slug}`;
}
