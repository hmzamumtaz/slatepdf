'use client';

import fontkit from '@pdf-lib/fontkit';
import type { PDFDocument, PDFFont } from 'pdf-lib';

/**
 * A Unicode safety net for drawn text.
 *
 * pdf-lib's standard fonts (Helvetica, Times, Courier) can only encode
 * WinAnsi/Latin-1. Every place this app draws text with one of them — a
 * watermark, an invisible OCR/repair/unlock text layer, a translated or
 * converted document — used to either throw or silently delete any character
 * outside that range: Cyrillic, Greek, Vietnamese diacritics, Polish/Czech/
 * Turkish letters, smart punctuation from autocorrect, all of it just vanished
 * with no warning.
 *
 * This bundles DejaVu Sans (Bitstream Vera license — free to embed and
 * redistribute; see public/fonts/DEJAVU-LICENSE.txt) as a fallback with far
 * broader coverage, fetched and embedded only when a document actually needs
 * it. It does not cover CJK, Arabic, Hebrew, Devanagari or Thai — and even
 * with the right glyphs, Arabic/Hebrew/Devanagari/Thai need contextual glyph
 * shaping this character-by-character drawing pipeline does not perform, so
 * swapping in a font with those glyphs would render disconnected, wrong-
 * looking letterforms rather than real text. `isRenderable` is honest about
 * that boundary so callers can warn instead of quietly mangling those scripts.
 */

const WINANSI_OK = (code: number) => (code >= 0x20 && code <= 0x7e) || (code >= 0xa0 && code <= 0xff);

// Unicode blocks DejaVu Sans covers well enough to draw correctly glyph by
// glyph, with no contextual shaping required.
const COVERED_RANGES: Array<[number, number]> = [
  [0x0100, 0x02af], // Latin Extended-A/B, IPA Extensions
  [0x0370, 0x03ff], // Greek and Coptic
  [0x0400, 0x04ff], // Cyrillic
  [0x1e00, 0x1eff], // Latin Extended Additional (precomposed Vietnamese)
  [0x2000, 0x206f], // General punctuation (en/em dash, smart quotes, ellipsis…)
  [0x20a0, 0x20cf], // Currency symbols
];

function inCoveredRange(code: number): boolean {
  return COVERED_RANGES.some(([lo, hi]) => code >= lo && code <= hi);
}

/** True if any character in the text falls outside plain WinAnsi/Latin-1. */
export function needsUnicodeFallback(text: string): boolean {
  for (const ch of text) if (!WINANSI_OK(ch.codePointAt(0)!)) return true;
  return false;
}

/** Whether this pipeline can draw every character in `text` correctly. */
export function isRenderable(text: string): boolean {
  for (const ch of text) {
    const code = ch.codePointAt(0)!;
    if (!WINANSI_OK(code) && !inCoveredRange(code)) return false;
  }
  return true;
}

/** The distinct characters neither the standard fonts nor the fallback can draw. */
export function unsupportedCharacters(text: string): string[] {
  const found = new Set<string>();
  for (const ch of text) {
    const code = ch.codePointAt(0)!;
    if (!WINANSI_OK(code) && !inCoveredRange(code)) found.add(ch);
  }
  return [...found];
}

let regularBytes: Promise<ArrayBuffer> | null = null;
let boldBytes: Promise<ArrayBuffer> | null = null;

function fetchFont(path: string): Promise<ArrayBuffer> {
  return fetch(path).then(r => {
    if (!r.ok) throw new Error(`Could not load the Unicode fallback font (HTTP ${r.status}).`);
    return r.arrayBuffer();
  });
}

const embedded = new WeakMap<PDFDocument, { regular?: Promise<PDFFont>; bold?: Promise<PDFFont> }>();

/**
 * Embed (once per document, cached) the Unicode fallback font. Subsetting
 * means the added file size scales with how much non-Latin-1 text the
 * document actually contains, not with the font's full ~4,500 glyphs.
 */
export async function embedUnicodeFallback(doc: PDFDocument, bold = false): Promise<PDFFont> {
  let entry = embedded.get(doc);
  if (!entry) { entry = {}; embedded.set(doc, entry); }
  const key = bold ? 'bold' : 'regular';
  if (!entry[key]) {
    entry[key] = (async () => {
      doc.registerFontkit(fontkit);
      if (bold) {
        boldBytes ??= fetchFont('/fonts/unicode-sans-bold.ttf');
        return doc.embedFont(await boldBytes, { subset: true });
      }
      regularBytes ??= fetchFont('/fonts/unicode-sans.ttf');
      return doc.embedFont(await regularBytes, { subset: true });
    })();
  }
  return entry[key]!;
}

/**
 * Pick the right font for one run of text: the standard font when it's plain
 * WinAnsi (best metrics, and adds nothing to file size), the bundled Unicode
 * fallback when the standard font can't encode it but the fallback can.
 * `supported: false` means neither can draw it correctly — the caller should
 * warn rather than silently drop or mangle the text.
 */
export async function pickFont(
  doc: PDFDocument,
  text: string,
  standardFont: PDFFont,
  bold = false,
): Promise<{ font: PDFFont; supported: boolean }> {
  if (!needsUnicodeFallback(text)) return { font: standardFont, supported: true };
  if (!isRenderable(text)) return { font: standardFont, supported: false };
  return { font: await embedUnicodeFallback(doc, bold), supported: true };
}
