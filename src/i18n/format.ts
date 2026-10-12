/** English UI text → translated text. */
export type Messages = Record<string, string>;
export type Vars = Record<string, string | number>;

/** Replaces {name} placeholders. Unknown placeholders are left as they are. */
export function interpolate(text: string, vars?: Vars): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (match, key: string) => (key in vars ? String(vars[key]) : match));
}

/**
 * Marks user-facing text in non-React code (thrown errors, validation
 * messages) so scripts/check-i18n.mjs extracts it for translation. It returns
 * the text unchanged; the component that displays it calls t() on it.
 */
export const msg = (text: string): string => text;
