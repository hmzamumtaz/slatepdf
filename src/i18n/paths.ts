import { DEFAULT_LOCALE, type AnyLocale } from './config';
import { LOCALIZED_SLUGS } from './slugs.generated';

/**
 * URL helpers. English keeps its existing URLs (/tools/merge-pdf); other
 * languages use a translated slug at the language root, as ilovepdf does
 * (/es/unir-pdf). Slugs come from each language's content file and are
 * collected into slugs.generated.ts by scripts/check-i18n.mjs.
 */

export function localizedSlug(locale: AnyLocale, slug: string): string {
  if (locale === DEFAULT_LOCALE) return slug;
  return LOCALIZED_SLUGS[locale]?.[slug] ?? slug;
}

/** English tool slug for a translated one, or undefined. */
export function slugFromLocalized(locale: AnyLocale, localized: string): string | undefined {
  if (locale === DEFAULT_LOCALE) return localized;
  const map = LOCALIZED_SLUGS[locale] ?? {};
  return Object.keys(map).find(slug => map[slug] === localized);
}

export function homeHref(locale: AnyLocale): string {
  return locale === DEFAULT_LOCALE ? '/' : `/${locale}`;
}

export function toolsHubHref(locale: AnyLocale): string {
  return locale === DEFAULT_LOCALE ? '/tools' : `/${locale}/tools`;
}

export function toolHref(locale: AnyLocale, slug: string): string {
  return locale === DEFAULT_LOCALE ? `/tools/${slug}` : `/${locale}/${localizedSlug(locale, slug)}`;
}

/** Pages that exist in every language, as a stable key. */
export type PageKey = { kind: 'home' } | { kind: 'hub' } | { kind: 'tool'; slug: string };

export function hrefFor(locale: AnyLocale, page: PageKey): string {
  if (page.kind === 'home') return homeHref(locale);
  if (page.kind === 'hub') return toolsHubHref(locale);
  return toolHref(locale, page.slug);
}

/** Works out which translatable page a pathname is, so the switcher can map it. */
export function pageFromPath(pathname: string): { locale: AnyLocale; page: PageKey } | null {
  const parts = pathname.replace(/\/+$/, '').split('/').filter(Boolean);
  if (parts.length === 0) return { locale: DEFAULT_LOCALE, page: { kind: 'home' } };
  if (parts[0] === 'tools') {
    if (parts.length === 1) return { locale: DEFAULT_LOCALE, page: { kind: 'hub' } };
    if (parts.length === 2) return { locale: DEFAULT_LOCALE, page: { kind: 'tool', slug: parts[1] } };
    return null;
  }
  const locale = parts[0] as AnyLocale;
  if (!(locale in LOCALIZED_SLUGS)) return null;
  if (parts.length === 1) return { locale, page: { kind: 'home' } };
  if (parts.length === 2 && parts[1] === 'tools') return { locale, page: { kind: 'hub' } };
  if (parts.length === 2) {
    const slug = slugFromLocalized(locale, decodeURIComponent(parts[1]));
    return slug ? { locale, page: { kind: 'tool', slug } } : null;
  }
  return null;
}
