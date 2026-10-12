import enContent from './content/en.json';
import { DEFAULT_LOCALE, type AnyLocale } from './config';
import { interpolate, type Messages, type Vars } from './format';
import { SITE_NAME } from '@/lib/site';

/**
 * Page content per language (titles, how-tos, FAQs, page chrome). Server
 * only: it is rendered into HTML and never shipped to the browser.
 */
export type LocaleContent = typeof enContent;
export type ToolContent = LocaleContent['tools'][keyof LocaleContent['tools']];

export async function getContent(locale: AnyLocale): Promise<LocaleContent> {
  if (locale === DEFAULT_LOCALE) return enContent;
  return (await import(`./content/${locale}.json`)).default as LocaleContent;
}

export function toolContent(content: LocaleContent, slug: string): ToolContent {
  return (content.tools as Record<string, ToolContent>)[slug];
}

export function categoryName(content: LocaleContent, category: string): string {
  return (content.categories as Record<string, { name: string }>)[category]?.name ?? category;
}

export function categoryBlurb(content: LocaleContent, category: string): string {
  return (content.categories as Record<string, { blurb: string }>)[category]?.blurb ?? '';
}

/** Fills {site} everywhere, plus any extra values. */
export function fill(text: string, vars?: Vars): string {
  return interpolate(text, { site: SITE_NAME, ...vars });
}

/** Namespaces of UI strings each tool page needs, besides "common" and its own. */
const EXTRA_NAMESPACES: Record<string, string[]> = {
  'edit-pdf': ['editor'],
  'pdf-workspace': ['workspace', 'editor'],
  'scan-pdf': ['scan'],
};

async function loadNamespace(locale: AnyLocale, ns: string): Promise<Messages> {
  try {
    return (await import(`./ui/${locale}/${ns}.json`)).default as Messages;
  } catch {
    return {};
  }
}

/**
 * UI strings for one tool page: shared strings, the tool's own, and the
 * localized tool names (ToolPage shows t(tool.name)), keyed by English text.
 */
export async function toolMessages(locale: AnyLocale, slug: string): Promise<Messages> {
  if (locale === DEFAULT_LOCALE) return {};
  const namespaces = ['common', slug, ...(EXTRA_NAMESPACES[slug] ?? [])];
  const parts = await Promise.all(namespaces.map(ns => loadNamespace(locale, ns)));
  const content = await getContent(locale);
  const names: Messages = {};
  for (const [s, en] of Object.entries(enContent.tools)) {
    const tr = toolContent(content, s);
    names[en.name] = tr.name;
    names[en.description] = tr.description;
  }
  return Object.assign({}, ...parts, names);
}
