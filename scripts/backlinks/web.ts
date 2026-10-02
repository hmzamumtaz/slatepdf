/**
 * Reading other people's pages: text for Claude to judge, contact addresses,
 * and whether a link to SlatePDF is already there.
 */
import { config } from './config';

const UA = `Mozilla/5.0 (compatible; SlatePDF-Outreach/1.0; +${config.site.url})`;

export async function fetchHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html' }, redirect: 'follow', signal: AbortSignal.timeout(20_000) });
    if (!res.ok || !(res.headers.get('content-type') ?? '').includes('html')) return null;
    return await res.text();
  } catch {
    return null;
  }
}

const decode = (s: string) => s
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));

export function pageText(html: string, maxChars = 30_000): string {
  return decode(html
    .replace(/<(script|style|noscript|svg|nav|footer)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<\/(p|div|li|h[1-6]|tr|br)>/gi, '\n')
    .replace(/<[^>]+>/g, ' '))
    .replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim().slice(0, maxChars);
}

export interface Anchor { href: string; text: string; rel: string }

export function anchors(html: string, base: string): Anchor[] {
  const out: Anchor[] = [];
  for (const m of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const href = m[1].match(/href\s*=\s*["']([^"']+)["']/i)?.[1];
    if (!href) continue;
    let abs: string;
    try { abs = new URL(decode(href), base).toString(); } catch { continue; }
    out.push({ href: abs, text: pageText(m[2], 200), rel: m[1].match(/rel\s*=\s*["']([^"']+)["']/i)?.[1] ?? '' });
  }
  return out;
}

export function findLinkToSite(html: string, base: string): Anchor | undefined {
  return anchors(html, base).find(a => {
    try { return new URL(a.href).hostname.replace(/^www\./, '') === config.site.host; } catch { return false; }
  });
}

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const JUNK = /(example\.|sentry|wixpress|\.png|\.jpg|\.webp|\.gif|noreply|no-reply|donotreply|privacy@|abuse@|legal@|dmca@|gdpr@)/i;

/** Public contact addresses from the page itself and its contact/about/write-for-us pages. */
export async function findContacts(url: string, html: string): Promise<{ emails: string[]; pagesText: string }> {
  const origin = new URL(url).origin;
  const domain = new URL(url).hostname.replace(/^www\./, '');
  const pages = [html];
  const contactLinks = anchors(html, url)
    .filter(a => a.href.startsWith(origin) && /contact|about|write-for-us|advertis|guest|team|submit/i.test(a.href + a.text))
    .map(a => a.href);
  const guesses = ['/contact', '/contact-us', '/about', '/write-for-us'].map(p => origin + p);
  for (const link of [...new Set([...contactLinks, ...guesses])].slice(0, 5)) {
    const h = await fetchHtml(link);
    if (h) pages.push(h);
  }

  const found = new Map<string, number>();
  for (const h of pages) {
    const mailtos = [...h.matchAll(/mailto:([^"'?>\s]+)/gi)].map(m => decodeURIComponent(m[1]));
    for (const e of [...mailtos, ...(decode(h).match(EMAIL_RE) ?? [])]) {
      const email = e.toLowerCase().replace(/[.,;]+$/, '');
      if (JUNK.test(email)) continue;
      // Prefer addresses on the site's own domain: they reach the person who edits the page.
      const score = (email.endsWith(`@${domain}`) ? 2 : 0) + (/^(editor|editorial|hello|contact|info|team|partnerships?)@/.test(email) ? 1 : 0);
      found.set(email, Math.max(found.get(email) ?? 0, score));
    }
  }
  const emails = [...found.entries()].sort((a, b) => b[1] - a[1]).map(([e]) => e);
  return { emails, pagesText: pages.slice(1).map(h => pageText(h, 4000)).join('\n---\n') };
}
