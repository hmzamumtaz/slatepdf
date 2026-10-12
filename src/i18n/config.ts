/**
 * Languages the site is published in. English lives at the root (/tools/…);
 * every other language lives under its own prefix (/es/…), like ilovepdf.
 *
 * To add a language: add it here, add src/i18n/content/<code>.json and the
 * src/i18n/ui/<code>/ dictionaries, then run scripts/check-i18n.mjs.
 */
export const DEFAULT_LOCALE = 'en';

export const LOCALES = [
  'es', 'pt', 'fr', 'de', 'it', 'id', 'ru', 'ar',
  'zh', 'ja', 'ko', 'hi', 'tr', 'nl', 'pl', 'vi', 'th', 'uk', 'sv',
  'cs', 'ro', 'hu', 'el', 'he', 'ms', 'bn', 'da', 'fi', 'nb',
] as const;
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
  zh: '简体中文',
  ja: '日本語',
  ko: '한국어',
  hi: 'हिन्दी',
  tr: 'Türkçe',
  nl: 'Nederlands',
  pl: 'Polski',
  vi: 'Tiếng Việt',
  th: 'ไทย',
  uk: 'Українська',
  sv: 'Svenska',
  cs: 'Čeština',
  ro: 'Română',
  hu: 'Magyar',
  el: 'Ελληνικά',
  he: 'עברית',
  ms: 'Bahasa Melayu',
  bn: 'বাংলা',
  da: 'Dansk',
  fi: 'Suomi',
  nb: 'Norsk bokmål',
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
  zh: 'zh_CN',
  ja: 'ja_JP',
  ko: 'ko_KR',
  hi: 'hi_IN',
  tr: 'tr_TR',
  nl: 'nl_NL',
  pl: 'pl_PL',
  vi: 'vi_VN',
  th: 'th_TH',
  uk: 'uk_UA',
  sv: 'sv_SE',
  cs: 'cs_CZ',
  ro: 'ro_RO',
  hu: 'hu_HU',
  el: 'el_GR',
  he: 'he_IL',
  ms: 'ms_MY',
  bn: 'bn_BD',
  da: 'da_DK',
  fi: 'fi_FI',
  nb: 'nb_NO',
};

export const RTL_LOCALES: ReadonlySet<AnyLocale> = new Set(['ar', 'he']);

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

export function dirFor(locale: AnyLocale): 'rtl' | 'ltr' {
  return RTL_LOCALES.has(locale) ? 'rtl' : 'ltr';
}
