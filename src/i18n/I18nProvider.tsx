'use client';

import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import { DEFAULT_LOCALE, type AnyLocale } from './config';
import { interpolate, type Messages, type Vars } from './format';
import { homeHref, toolHref } from './paths';

interface I18nValue {
  locale: AnyLocale;
  messages: Messages;
}

const I18nContext = createContext<I18nValue>({ locale: DEFAULT_LOCALE, messages: {} });

/**
 * Supplies UI translations to client components. English pages render no
 * provider, so every t() call there returns the English text unchanged.
 */
export function I18nProvider({ locale, messages, children }: I18nValue & { children: ReactNode }) {
  const value = useMemo(() => ({ locale, messages }), [locale, messages]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useLocale(): AnyLocale {
  return useContext(I18nContext).locale;
}

/**
 * Translate UI text. The key is the English text itself, with {name}
 * placeholders for variable parts:
 *
 *   t('Merge PDFs')
 *   t('Upload at least {count} files', { count: 2 })
 *
 * Missing translations fall back to English, so nothing ever renders blank.
 */
export function useT() {
  const { messages } = useContext(I18nContext);
  return useCallback((text: string, vars?: Vars) => interpolate(messages[text] ?? text, vars), [messages]);
}

/** Link to another tool in the current language: toolLink('compress-pdf'). */
export function useToolHref() {
  const locale = useLocale();
  return useCallback((slug: string) => toolHref(locale, slug), [locale]);
}

/** The homepage in the current language ("/" in English). */
export function useHomeHref(): string {
  return homeHref(useLocale());
}
