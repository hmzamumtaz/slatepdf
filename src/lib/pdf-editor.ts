'use client';

import {
  StandardFonts, rgb, decodePDFRawStream, PDFArray, PDFDict, PDFName, PDFRawStream,
  type PDFDocument, type PDFFont, type PDFObject, type PDFPage,
} from 'pdf-lib';
import { getPdfJs, readFileAsArrayBuffer, loadPdf } from './pdf-engine';

/**
 * Text editing for PDFs.
 *
 * A PDF stores glyphs at coordinates rather than paragraphs, so there is no
 * text flow to re-wrap. What this does instead is read every run of text with
 * its position, size, style and colour, and on export rebuild the text layer of
 * the pages that were edited: the text-drawing operators are removed from the
 * page and every run is drawn again, carrying the user's changes.
 *
 * Removing rather than painting over matters. A white box on top of a word
 * leaves the word in the file, where search and copy-paste still find it — so
 * an "edited" price or a "deleted" address would still be in the document. This
 * takes the glyphs out.
 *
 * The cost is that text on an edited page is redrawn in a standard PDF font.
 * Pages the user never touches are not rewritten at all.
 */

export type FontFamily = 'Helvetica' | 'Times' | 'Courier';

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export interface TextBlock {
  id: string;
  /** 0-based page index. */
  page: number;
  text: string;
  /** What the document said before the user touched it. Empty for added text. */
  original: string;
  /** Baseline origin in PDF points, measured from the bottom-left of the page. */
  x: number;
  y: number;
  /** Width of the original run, in points. */
  width: number;
  fontSize: number;
  family: FontFamily;
  bold: boolean;
  italic: boolean;
  color: Rgb;
  deleted: boolean;
  added: boolean;
}

export interface LoadedPage {
  index: number;
  /** Page size in points. */
  width: number;
  height: number;
  /** The page rendered as it currently stands, for the preview and hit boxes. */
  image: string;
  blocks: TextBlock[];
}

export interface EditorSession {
  numPages: number;
  getPage(index: number): Promise<LoadedPage>;
  destroy(): void;
}

const BLACK: Rgb = { r: 0, g: 0, b: 0 };
const WHITE: Rgb = { r: 255, g: 255, b: 255 };
const DELIMITERS = new Set([0x20, 0x0a, 0x0d, 0x09, 0x0c, 0x00, 0x2f, 0x5b, 0x5d, 0x3c, 0x3e, 0x28, 0x29, 0x7b, 0x7d, 0x25]);

/** Characters outside WinAnsi that have an obvious plain equivalent. */
const SUBSTITUTIONS: Record<string, string> = {
  '‘': "'", '’': "'", '‚': ',', '‛': "'",
  '“': '"', '”': '"', '„': '"',
  '–': '-', '—': '-', '−': '-', '‐': '-', '‑': '-',
  '…': '...', ' ': ' ', ' ': ' ', ' ': ' ', '​': '',
  '•': '·', '′': "'", '″': '"',
};

/**
 * The standard PDF fonts encode WinAnsi only. Map what can be mapped and report
 * what cannot, so the UI can warn before the character silently disappears.
 */
export function toWinAnsi(text: string): { text: string; dropped: string[] } {
  const dropped: string[] = [];
  let out = '';
  for (const ch of text) {
    if (SUBSTITUTIONS[ch] !== undefined) {
      out += SUBSTITUTIONS[ch];
      continue;
    }
    const code = ch.codePointAt(0)!;
    // Printable ASCII, plus the Latin-1 range the standard fonts cover.
    if ((code >= 0x20 && code <= 0x7e) || (code >= 0xa0 && code <= 0xff)) {
      out += ch;
    } else if (ch === '\t') {
      out += '    ';
    } else {
      if (!dropped.includes(ch)) dropped.push(ch);
    }
  }
  return { text: out, dropped };
}

export function isChanged(block: TextBlock): boolean {
  return block.added || block.deleted || block.text !== block.original;
}

function styleFromFontName(name: string): { family: FontFamily; bold: boolean; italic: boolean } {
  const n = name.toLowerCase();
  const bold = /bold|black|heavy|semib|[-_,]bd\b|700|800|900/.test(n);
  const italic = /italic|oblique|[-_,]it\b/.test(n);
  let family: FontFamily = 'Helvetica';
  if (/courier|mono|consol/.test(n)) family = 'Courier';
  else if (/times|serif|georgia|garamond|book|roman|minion|caslon|baskerville/.test(n) && !/sans/.test(n)) family = 'Times';
  return { family, bold, italic };
}

/** Distance between two colours, good enough to tell ink from paper. */
function distance(a: Rgb, b: Rgb): number {
  return Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b);
}

interface Sampler {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

function pixelAt(s: Sampler, x: number, y: number): Rgb | null {
  if (x < 0 || y < 0 || x >= s.width || y >= s.height) return null;
  const i = (Math.floor(y) * s.width + Math.floor(x)) * 4;
  return { r: s.data[i], g: s.data[i + 1], b: s.data[i + 2] };
}

/**
 * The paper colour behind a run: the most common colour in a ring just outside
 * its box. Sampling the surroundings rather than assuming white keeps the cover
 * rectangle invisible on shaded tables and coloured headers.
 */
function sampleBackground(s: Sampler, left: number, top: number, right: number, bottom: number): Rgb {
  const counts = new Map<string, { colour: Rgb; n: number }>();
  const pad = 3;
  const record = (x: number, y: number) => {
    const p = pixelAt(s, x, y);
    if (!p) return;
    // Quantise so anti-aliasing noise collapses onto one bucket.
    const key = `${p.r >> 3}:${p.g >> 3}:${p.b >> 3}`;
    const hit = counts.get(key);
    if (hit) hit.n++;
    else counts.set(key, { colour: p, n: 1 });
  };

  const step = Math.max(1, Math.floor((right - left) / 24));
  for (let x = left; x <= right; x += step) {
    record(x, top - pad);
    record(x, bottom + pad);
  }
  for (let y = top; y <= bottom; y += Math.max(1, Math.floor((bottom - top) / 6))) {
    record(left - pad, y);
    record(right + pad, y);
  }

  let best: { colour: Rgb; n: number } | null = null;
  for (const entry of counts.values()) if (!best || entry.n > best.n) best = entry;
  return best?.colour ?? WHITE;
}

/**
 * The ink colour of a run: the pixel inside its box furthest from the paper.
 * Glyph cores are the extreme, so this lands on the real colour rather than on
 * an anti-aliased edge.
 */
function sampleInk(s: Sampler, left: number, top: number, right: number, bottom: number, background: Rgb): Rgb {
  let best = background;
  let bestDistance = 0;
  const stepX = Math.max(1, Math.floor((right - left) / 60));
  const stepY = Math.max(1, Math.floor((bottom - top) / 12));
  for (let y = top; y <= bottom; y += stepY) {
    for (let x = left; x <= right; x += stepX) {
      const p = pixelAt(s, x, y);
      if (!p) continue;
      const d = distance(p, background);
      if (d > bestDistance) {
        bestDistance = d;
        best = p;
      }
    }
  }
  // Nothing stood out from the paper — the run is probably whitespace.
  return bestDistance < 40 ? BLACK : best;
}

interface RawRun {
  text: string;
  x: number;
  y: number;
  width: number;
  fontSize: number;
  family: FontFamily;
  bold: boolean;
  italic: boolean;
}

/**
 * pdf.js hands back text in fragments that can be as small as a single glyph.
 * Join fragments that sit on the same baseline, are close together and share a
 * style — so a paragraph becomes one editable line, while a bold total inside a
 * sentence stays its own block and keeps its own formatting.
 */
function joinRuns(runs: RawRun[]): RawRun[] {
  const sorted = [...runs].sort((a, b) => (Math.abs(a.y - b.y) > 1 ? b.y - a.y : a.x - b.x));
  const out: RawRun[] = [];

  for (const run of sorted) {
    const prev = out[out.length - 1];
    const sameLine = prev && Math.abs(prev.y - run.y) <= Math.max(1, prev.fontSize * 0.3);
    const sameStyle =
      prev &&
      prev.family === run.family &&
      prev.bold === run.bold &&
      prev.italic === run.italic &&
      Math.abs(prev.fontSize - run.fontSize) < 0.6;
    const gap = prev ? run.x - (prev.x + prev.width) : Infinity;

    if (prev && sameLine && sameStyle && gap > -prev.fontSize * 0.5 && gap < prev.fontSize * 0.9) {
      // A gap wider than a space means the author put one there.
      const spacer = gap > prev.fontSize * 0.18 && !/\s$/.test(prev.text) && !/^\s/.test(run.text) ? ' ' : '';
      prev.text += spacer + run.text;
      prev.width = run.x + run.width - prev.x;
    } else {
      out.push({ ...run });
    }
  }

  return out.filter(r => r.text.trim().length > 0);
}

/**
 * Open a document for editing. Pages are read on demand — a 200-page file would
 * be slow and pointless to render up front when the user edits three pages.
 */
export async function openEditableDocument(file: File): Promise<EditorSession> {
  const pdfjsLib = await getPdfJs();
  const buf = await readFileAsArrayBuffer(file);
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
  const cache = new Map<number, LoadedPage>();

  return {
    numPages: pdf.numPages,

    async getPage(index: number): Promise<LoadedPage> {
      const cached = cache.get(index);
      if (cached) return cached;

      const page = await pdf.getPage(index + 1);
      const base = page.getViewport({ scale: 1 });
      const scale = Math.min(2, 2200 / Math.max(base.width, base.height));
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
      await page.render({ canvasContext: ctx, viewport, canvas }).promise;

      const sampler: Sampler = {
        data: ctx.getImageData(0, 0, canvas.width, canvas.height).data,
        width: canvas.width,
        height: canvas.height,
      };

      // commonObjs is only populated once the page has rendered, which is why
      // the text is read after the draw rather than before it.
      const content = await page.getTextContent();
      const raw: RawRun[] = [];
      for (const item of content.items as Array<Record<string, unknown>>) {
        const text = typeof item.str === 'string' ? item.str : '';
        if (!text.trim()) continue;
        const t = item.transform as number[];
        const fontSize = Math.hypot(t[2], t[3]) || Math.abs(t[3]) || 10;

        let fontName = '';
        try {
          const key = item.fontName as string;
          if (key && page.commonObjs.has(key)) {
            fontName = (page.commonObjs.get(key) as { name?: string })?.name ?? '';
          }
        } catch {
          // Font metadata is a nicety; the run is still editable without it.
        }

        raw.push({
          text,
          x: t[4],
          y: t[5],
          width: (item.width as number) || text.length * fontSize * 0.5,
          fontSize,
          ...styleFromFontName(fontName || (item.fontName as string) || ''),
        });
      }

      const blocks: TextBlock[] = joinRuns(raw).map((run, i) => {
        const left = run.x * scale;
        const right = (run.x + run.width) * scale;
        const baseline = (base.height - run.y) * scale;
        const top = baseline - run.fontSize * 0.82 * scale;
        const bottom = baseline + run.fontSize * 0.24 * scale;
        const background = sampleBackground(sampler, left, top, right, bottom);
        return {
          id: `p${index}-b${i}`,
          page: index,
          text: run.text,
          original: run.text,
          x: run.x,
          y: run.y,
          width: run.width,
          fontSize: run.fontSize,
          family: run.family,
          bold: run.bold,
          italic: run.italic,
          color: sampleInk(sampler, left, top, right, bottom, background),
          deleted: false,
          added: false,
        };
      });

      const loaded: LoadedPage = {
        index,
        width: base.width,
        height: base.height,
        image: canvas.toDataURL('image/jpeg', 0.85),
        blocks,
      };
      cache.set(index, loaded);
      return loaded;
    },

    destroy() {
      cache.clear();
      void pdf.cleanup();
    },
  };
}

const STANDARD_FONTS: Record<FontFamily, Record<string, StandardFonts>> = {
  Helvetica: {
    regular: StandardFonts.Helvetica,
    bold: StandardFonts.HelveticaBold,
    italic: StandardFonts.HelveticaOblique,
    bolditalic: StandardFonts.HelveticaBoldOblique,
  },
  Times: {
    regular: StandardFonts.TimesRoman,
    bold: StandardFonts.TimesRomanBold,
    italic: StandardFonts.TimesRomanItalic,
    bolditalic: StandardFonts.TimesRomanBoldItalic,
  },
  Courier: {
    regular: StandardFonts.Courier,
    bold: StandardFonts.CourierBold,
    italic: StandardFonts.CourierOblique,
    bolditalic: StandardFonts.CourierBoldOblique,
  },
};

function fontKey(block: Pick<TextBlock, 'family' | 'bold' | 'italic'>): string {
  const weight = `${block.bold ? 'bold' : ''}${block.italic ? 'italic' : ''}` || 'regular';
  return `${block.family}:${weight}`;
}

/**
 * Delete every BT…ET block from a content stream.
 *
 * Those blocks hold text and nothing else, so removing them whole takes the
 * words out without disturbing a single line, fill or image. The scan has to
 * step over strings, hex strings, comments and inline image data, because any
 * of them can contain the bytes "BT" without meaning an operator.
 */
export function stripTextBlocks(input: Uint8Array): Uint8Array {
  const out: number[] = [];
  const n = input.length;
  let i = 0;
  let depth = 0;

  const isDelimiter = (b: number) => DELIMITERS.has(b);
  const keep = (from: number, to: number) => {
    if (depth === 0) for (let k = from; k < to; k++) out.push(input[k]);
  };

  while (i < n) {
    const c = input[i];

    // Comment
    if (c === 0x25) {
      const start = i;
      while (i < n && input[i] !== 0x0a && input[i] !== 0x0d) i++;
      keep(start, i);
      continue;
    }

    // Literal string: ( ... ) with escapes and nesting
    if (c === 0x28) {
      const start = i;
      let nest = 1;
      i++;
      while (i < n && nest > 0) {
        if (input[i] === 0x5c) i += 2;
        else if (input[i] === 0x28) { nest++; i++; }
        else if (input[i] === 0x29) { nest--; i++; }
        else i++;
      }
      keep(start, i);
      continue;
    }

    // Hex string: < ... >, but << opens a dictionary
    if (c === 0x3c && input[i + 1] !== 0x3c) {
      const start = i;
      i++;
      while (i < n && input[i] !== 0x3e) i++;
      i++;
      keep(start, i);
      continue;
    }

    if (isDelimiter(c)) {
      keep(i, i + 1);
      i++;
      continue;
    }

    // A bare token: an operator, a number or a name
    const start = i;
    while (i < n && !isDelimiter(input[i])) i++;
    const token = String.fromCharCode(...input.slice(start, i));

    if (token === 'BT') {
      depth++;
      continue; // drop the operator itself
    }
    if (token === 'ET') {
      if (depth > 0) { depth--; continue; }
      keep(start, i);
      continue;
    }
    if (token === 'BI') {
      // Inline image: binary data between ID and EI can hold anything.
      const imageStart = start;
      while (i < n - 1 && !(input[i] === 0x49 && input[i + 1] === 0x44)) i++;
      i += 2;
      while (i < n - 1 && !(input[i] === 0x45 && input[i + 1] === 0x49 && isDelimiter(input[i - 1]))) i++;
      i += 2;
      keep(imageStart, i);
      continue;
    }

    keep(start, i);
  }

  return Uint8Array.from(out);
}

function decodeStream(stream: unknown): Uint8Array | null {
  if (!(stream instanceof PDFRawStream)) return null;
  try {
    return decodePDFRawStream(stream).decode();
  } catch {
    return null;
  }
}

/**
 * Replace a page's content streams with the same content minus its text.
 * Returns false only when a stream exists but cannot be read — an empty page
 * has nothing to strip and is not a failure.
 */
function stripPageText(doc: PDFDocument, page: PDFPage): boolean {
  const contents = page.node.Contents();
  if (!contents) return true;

  const streams = contents instanceof PDFArray
    ? contents.asArray().map(ref => doc.context.lookup(ref))
    : [contents];

  const parts: Uint8Array[] = [];
  for (const stream of streams) {
    const bytes = decodeStream(stream);
    if (!bytes) return false;
    parts.push(stripTextBlocks(bytes));
  }
  if (parts.length === 0) return true;

  const total = parts.reduce((sum, part) => sum + part.length + 1, 0);
  const joined = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    joined.set(part, offset);
    offset += part.length;
    joined[offset++] = 0x0a;
  }

  page.node.set(PDFName.of('Contents'), doc.context.register(doc.context.flateStream(joined)));
  return true;
}

/**
 * Text can also live inside form XObjects the page draws. Strip those too,
 * writing the result to fresh objects so a page that was never edited keeps the
 * originals it shares.
 */
function stripXObjectText(doc: PDFDocument, page: PDFPage, seen = new Set<string>(), depth = 0): void {
  if (depth > 4) return;
  const resources = page.node.Resources();
  if (!resources) return;

  let xobjects: PDFDict | undefined;
  try {
    xobjects = resources.lookup(PDFName.of('XObject'), PDFDict);
  } catch {
    return;
  }
  if (!xobjects) return;

  const replacements: Array<[PDFName, Uint8Array]> = [];
  for (const [name, value] of xobjects.entries()) {
    const key = name.asString();
    if (seen.has(key)) continue;
    seen.add(key);
    try {
      const stream = doc.context.lookup(value);
      if (!(stream instanceof PDFRawStream)) continue;
      const subtype = stream.dict.get(PDFName.of('Subtype'));
      if (!subtype || subtype.toString() !== '/Form') continue;
      const bytes = decodeStream(stream);
      if (!bytes) continue;
      replacements.push([name, stripTextBlocks(bytes)]);
    } catch {
      // A form we cannot read is left alone; its text simply stays put.
    }
  }

  if (replacements.length === 0) return;

  // Clone the dictionaries before writing, so other pages keep what they had.
  const ownResources = resources.clone(doc.context);
  const ownXObjects = xobjects.clone(doc.context);
  for (const [name, bytes] of replacements) {
    const original = doc.context.lookup(xobjects.get(name));
    const dict = original instanceof PDFRawStream ? original.dict.clone(doc.context) : undefined;
    const replacement = doc.context.flateStream(bytes, dict ? dictEntries(dict) : undefined);
    ownXObjects.set(name, doc.context.register(replacement));
  }
  ownResources.set(PDFName.of('XObject'), doc.context.register(ownXObjects));
  page.node.set(PDFName.of('Resources'), doc.context.register(ownResources));
}

/** Carry a form's own dictionary entries (BBox, Matrix, Resources) onto its replacement. */
function dictEntries(dict: PDFDict): Record<string, PDFObject> {
  const out: Record<string, PDFObject> = {};
  for (const [key, value] of dict.entries()) {
    const name = key.asString().slice(1);
    // The replacement stream declares its own length and compression.
    if (name === 'Length' || name === 'Filter' || name === 'DecodeParms') continue;
    out[name] = value;
  }
  return out;
}

/**
 * Nudge the size of untouched text so a base-14 font occupies the width the
 * original did. Small corrections only — a large one would mean the substitute
 * is nothing like the original, and shrinking it further would not help.
 */
function fitSize(font: PDFFont, text: string, desired: number, targetWidth: number): number {
  if (targetWidth <= 0) return desired;
  const drawn = font.widthOfTextAtSize(text, desired);
  if (drawn <= 0) return desired;
  const ratio = targetWidth / drawn;
  return ratio > 0.8 && ratio < 1.25 ? desired * ratio : desired;
}

/**
 * Write the edits into the document. Only pages carrying an edit are rebuilt;
 * every other page keeps its original bytes, fonts and images untouched.
 */
export async function buildEditedPdf(file: File, blocks: TextBlock[]): Promise<Uint8Array> {
  const buf = await readFileAsArrayBuffer(file);
  const doc = await loadPdf(buf);
  const editedPages = new Set(blocks.filter(isChanged).map(b => b.page));
  if (editedPages.size === 0) return doc.save();

  const fonts = new Map<string, PDFFont>();
  const fontFor = async (block: TextBlock): Promise<PDFFont> => {
    const key = fontKey(block);
    const existing = fonts.get(key);
    if (existing) return existing;
    const weight = `${block.bold ? 'bold' : ''}${block.italic ? 'italic' : ''}` || 'regular';
    const font = await doc.embedFont(STANDARD_FONTS[block.family][weight]);
    fonts.set(key, font);
    return font;
  };

  const pageCount = doc.getPageCount();

  for (const pageIndex of editedPages) {
    if (pageIndex < 0 || pageIndex >= pageCount) continue;
    const page = doc.getPage(pageIndex);

    if (!stripPageText(doc, page)) {
      // Redrawing without removing the originals would double every word, so
      // say what happened rather than hand back a mangled document.
      throw new Error(
        `Page ${pageIndex + 1} uses a content stream this tool cannot rewrite, so its text cannot be edited.`,
      );
    }
    stripXObjectText(doc, page);

    for (const block of blocks) {
      if (block.page !== pageIndex || block.deleted) continue;
      const { text } = toWinAnsi(block.text);
      if (!text.trim()) continue;

      const font = await fontFor(block);
      const size = isChanged(block) ? block.fontSize : fitSize(font, text, block.fontSize, block.width);

      page.drawText(text, {
        x: block.x,
        y: block.y,
        size,
        font,
        color: rgb(block.color.r / 255, block.color.g / 255, block.color.b / 255),
      });
    }
  }

  return doc.save();
}

export function rgbToHex({ r, g, b }: Rgb): string {
  return `#${[r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;
}

export function hexToRgb(hex: string): Rgb {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean;
  return {
    r: parseInt(full.slice(0, 2), 16) || 0,
    g: parseInt(full.slice(2, 4), 16) || 0,
    b: parseInt(full.slice(4, 6), 16) || 0,
  };
}
