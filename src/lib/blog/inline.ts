/**
 * Inline links inside article text: `[label](/tools/merge-pdf)`. Only
 * site-relative paths are recognised, so a stray bracket in prose stays text.
 */
const LINK = /\[([^\]]+)\]\((\/[^)\s]*)\)/g;

export type InlinePart = string | { label: string; href: string };

export function parseInline(text: string): InlinePart[] {
  const parts: InlinePart[] = [];
  let last = 0;
  for (const m of text.matchAll(LINK)) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push({ label: m[1], href: m[2] });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

/** The text as a reader sees it, links reduced to their labels. */
export function stripInline(text: string): string {
  return text.replace(LINK, '$1');
}

/** Every site-relative path linked from the text. */
export function inlineHrefs(text: string): string[] {
  return [...text.matchAll(LINK)].map((m) => m[2]);
}
