/**
 * Languages the site is published in. English lives at the root (/tools/…);
 * every other language lives under its own prefix (/es/…), like ilovepdf.
 *
 * To add a language: add it here, add src/i18n/content/<code>.json and the
 * src/i18n/ui/<code>/ dictionaries, then run scripts/check-i18n.mjs.
 */
export const DEFAULT_LOCALE = 'en';

export const LOCALES = ['es', 'pt', 'fr', 'de', 'it', 'id', 'ru', 'ar'] as const;
export type Locale = (typeof LOCALES)[number];
export type AnyLocale = Locale | typeof DEFAULT_LOCALE;

export const ALL_LOCALES: AnyLocale[] = [DEFAULT_LOCALE, ...LOCALES];

/** Native name, shown in the language switcher. */
export const LOCALE_NAMES: Record<AnyLocale, string> = {
  en: 'English',
  es: 'Español',
  pt: 'Português',
  fr: 'Français',
  de: 'Deutsch',
  it: 'Italiano',
  id: 'Bahasa Indonesia',
  ru: 'Русский',
  ar: 'العربية',
};

/** Open Graph locale tags. */
export const OG_LOCALES: Record<AnyLocale, string> = {
  en: 'en_US',
  es: 'es_ES',
  pt: 'pt_BR',
  fr: 'fr_FR',
  de: 'de_DE',
  it: 'it_IT',
  id: 'id_ID',
  ru: 'ru_RU',
  ar: 'ar_AR',
};

export const RTL_LOCALES: ReadonlySet<AnyLocale> = new Set(['ar']);

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

export function dirFor(locale: AnyLocale): 'rtl' | 'ltr' {
  return RTL_LOCALES.has(locale) ? 'rtl' : 'ltr';
}
