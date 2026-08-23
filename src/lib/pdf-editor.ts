'use client';

import { PDFDocument, PDFDict, PDFName, PDFRawStream, PDFArray, rgb, decodePDFRawStream } from 'pdf-lib';
import { getPdfJs, readFileAsArrayBuffer, loadPdf } from './pdf-engine';
import { collectEmbeddedFonts, FontResolver, type FontFamily } from './pdf-fonts';
import { repairFontProgram } from './sfnt';
import {
  scanContentStream, rewriteContentStream, multiply, invert,
  type Matrix,
} from './pdf-content-stream';

/**
 * Editing the contents of a PDF.
 *
 * A PDF has no paragraphs and no layout model — it is a list of operators that
 * paint glyphs and images at fixed coordinates. Editing it properly therefore
 * means changing those operators, not painting over the result: a white box on
 * top of a word leaves the word in the file, where search and copy-paste still
 * find it.
 *
 * So this reads the operators, works out what each one draws and where, and on
 * export rewrites the stream: the operators behind edited text and altered
 * images are removed, and the replacements are drawn in their place. Everything
 * else on the page is copied through byte for byte.
 *
 * Where it can, redrawn text reuses the font the document already embeds, so an
 * edited word looks like the words beside it.
 */

export type { FontFamily } from './pdf-fonts';
export { normaliseFontName } from './pdf-fonts';

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TextBlock {
  id: string;
  page: number;
  text: string;
  /** What the document said before the user touched it. Empty for added text. */
  original: string;
  /** Baseline origin in PDF points, from the bottom-left of the page. */
  x: number;
  y: number;
  width: number;
  fontSize: number;
  family: FontFamily;
  bold: boolean;
  italic: boolean;
  color: Rgb;
  /** The paper behind the run, so the editor can cover it while you type. */
  background: Rgb;
  /** PostScript name of the font the run used, so it can be reused. */
  sourceFont?: string;
  deleted: boolean;
  added: boolean;
}

export interface ImageObject {
  id: string;
  page: number;
  /** Where it sits now — the user can move and resize it. */
  box: Box;
  originalBox: Box;
  rotated: boolean;
  opIndex: number;
  thumbnail: string;
  deleted: boolean;
  /** A picture chosen to take its place. */
  replacement: { dataUrl: string; name: string } | null;
}

/** A font programme from the document, repaired so a browser can load it. */
export interface EditorFont {
  /** Normalised PostScript name, matching TextBlock.sourceFont. */
  key: string;
  bytes: Uint8Array;
}

export interface LoadedPage {
  index: number;
  /** Display size in points — already includes the page's /Rotate. */
  width: number;
  height: number;
  /**
   * PDF user space to display space, at one point per pixel. Rotated pages make
   * this more than a flip, so the editor maps every box through it.
   */
  transform: number[];
  image: string;
  blocks: TextBlock[];
  images: ImageObject[];
  /** The page's own faces, for typing in the document's typeface. */
  fonts: EditorFont[];
}

export interface EditorSession {
  numPages: number;
  getPage(index: number): Promise<LoadedPage>;
  destroy(): void;
}

const BLACK: Rgb = { r: 0, g: 0, b: 0 };
const WHITE: Rgb = { r: 255, g: 255, b: 255 };

const SUBSTITUTIONS: Record<string, string> = {
  '\u2018': "'", '\u2019': "'", '\u201a': ',', '\u201b': "'",
  '\u201c': '"', '\u201d': '"', '\u201e': '"',
  '\u2013': '-', '\u2014': '-', '\u2212': '-', '\u2010': '-', '\u2011': '-',
  '\u2026': '...', '\u2022': '\u00b7', '\u2032': "'", '\u2033': '"',
  '\u00a0': ' ', '\u2009': ' ', '\u202f': ' ', '\u2007': ' ', '\u200b': '',
};

/**
 * Standard PDF fonts encode WinAnsi only. Map what maps cleanly and report what
 * does not, so the interface can warn before a character quietly disappears.
 * Text drawn in a font lifted from the document has no such limit.
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
    if ((code >= 0x20 && code <= 0x7e) || (code >= 0xa0 && code <= 0xff)) out += ch;
    else if (ch === '\t') out += '    ';
    else if (!dropped.includes(ch)) dropped.push(ch);
  }
  return { text: out, dropped };
}

export function isChanged(block: TextBlock): boolean {
  return block.added || block.deleted || block.text !== block.original;
}

export function isImageChanged(image: ImageObject): boolean {
  return (
    image.deleted ||
    image.replacement !== null ||
    Math.abs(image.box.x - image.originalBox.x) > 0.01 ||
    Math.abs(image.box.y - image.originalBox.y) > 0.01 ||
    Math.abs(image.box.width - image.originalBox.width) > 0.01 ||
    Math.abs(image.box.height - image.originalBox.height) > 0.01
  );
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

const distance = (a: Rgb, b: Rgb) => Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b);

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

/** The paper colour behind a run: the most common colour in a ring around it. */
function sampleBackground(s: Sampler, left: number, top: number, right: number, bottom: number): Rgb {
  const counts = new Map<string, { colour: Rgb; n: number }>();
  const record = (x: number, y: number) => {
    const p = pixelAt(s, x, y);
    if (!p) return;
    const key = `${p.r >> 3}:${p.g >> 3}:${p.b >> 3}`;
    const hit = counts.get(key);
    if (hit) hit.n++;
    else counts.set(key, { colour: p, n: 1 });
  };
  const step = Math.max(1, Math.floor((right - left) / 24));
  for (let x = left; x <= right; x += step) {
    record(x, top - 3);
    record(x, bottom + 3);
  }
  for (let y = top; y <= bottom; y += Math.max(1, Math.floor((bottom - top) / 6))) {
    record(left - 3, y);
    record(right + 3, y);
  }
  let best: { colour: Rgb; n: number } | null = null;
  for (const entry of counts.values()) if (!best || entry.n > best.n) best = entry;
  return best?.colour ?? WHITE;
}

/** The ink colour: the pixel inside the run furthest from the paper around it. */
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
  sourceFont: string;
}

/**
 * pdf.js returns text in fragments that can be a single glyph. Join fragments
 * on the same baseline that are close together and share a style, so a sentence
 * becomes one editable line while a bold total inside it stays its own block.
 */
function joinRuns(runs: RawRun[]): RawRun[] {
  const sorted = [...runs].sort((a, b) => (Math.abs(a.y - b.y) > 1 ? b.y - a.y : a.x - b.x));
  const out: RawRun[] = [];

  for (const run of sorted) {
    const prev = out[out.length - 1];
    const sameLine = prev && Math.abs(prev.y - run.y) <= Math.max(1, prev.fontSize * 0.3);
    const sameStyle =
      prev &&
      prev.sourceFont === run.sourceFont &&
      prev.bold === run.bold &&
      prev.italic === run.italic &&
      Math.abs(prev.fontSize - run.fontSize) < 0.6;
    const gap = prev ? run.x - (prev.x + prev.width) : Infinity;

    if (prev && sameLine && sameStyle && gap > -prev.fontSize * 0.5 && gap < prev.fontSize * 0.9) {
      const spacer = gap > prev.fontSize * 0.18 && !/\s$/.test(prev.text) && !/^\s/.test(run.text) ? ' ' : '';
      prev.text += spacer + run.text;
      prev.width = run.x + run.width - prev.x;
    } else {
      out.push({ ...run });
    }
  }

  return out.filter(r => r.text.trim().length > 0);
}

/** Names of the image XObjects a page can draw, e.g. "/Im0". */
function imageNamesFor(doc: PDFDocument, pageIndex: number): Set<string> {
  const names = new Set<string>();
  try {
    const xobjects = doc.getPage(pageIndex).node.Resources()?.lookup(PDFName.of('XObject'), PDFDict);
    if (!xobjects) return names;
    for (const [name, value] of xobjects.entries()) {
      const stream = doc.context.lookup(value);
      if (!(stream instanceof PDFRawStream)) continue;
      if (stream.dict.get(PDFName.of('Subtype'))?.toString() === '/Image') names.add(name.asString());
    }
  } catch {
    // A page whose resources cannot be read simply has no editable images.
  }
  return names;
}

function pageContentBytes(doc: PDFDocument, pageIndex: number): Uint8Array | null {
  const contents = doc.getPage(pageIndex).node.Contents();
  if (!contents) return new Uint8Array(0);
  const streams = contents instanceof PDFArray
    ? contents.asArray().map(ref => doc.context.lookup(ref))
    : [contents];

  const parts: Uint8Array[] = [];
  for (const stream of streams) {
    if (!(stream instanceof PDFRawStream)) return null;
    try {
      parts.push(decodePDFRawStream(stream).decode());
    } catch {
      return null;
    }
  }
  const total = parts.reduce((sum, p) => sum + p.length + 1, 0);
  const joined = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    joined.set(part, offset);
    offset += part.length;
    joined[offset++] = 0x0a;
  }
  return joined;
}

/**
 * Open a document for editing. Pages are read on demand — rendering a
 * two-hundred page file up front would be slow and mostly wasted.
 */
export async function openEditableDocument(file: File): Promise<EditorSession> {
  const pdfjsLib = await getPdfJs();
  const buf = await readFileAsArrayBuffer(file);
  // pdf.js transfers the buffer it is handed to its worker, which detaches the
  // original — so give it a copy and keep `buf` for pdf-lib.
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buf.slice(0)) }).promise;
  const lib = await loadPdf(buf);
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

      // Everything the page reports is in PDF user space; the canvas it was
      // drawn on is not, once /Rotate is involved. This maps between them.
      const vt = viewport.transform as number[];
      const toCanvas = (x: number, y: number): [number, number] =>
        [vt[0] * x + vt[2] * y + vt[4], vt[1] * x + vt[3] * y + vt[5]];
      const canvasBox = (x0: number, y0: number, x1: number, y1: number) => {
        const points = [toCanvas(x0, y0), toCanvas(x1, y0), toCanvas(x1, y1), toCanvas(x0, y1)];
        return {
          left: Math.min(...points.map(p => p[0])),
          right: Math.max(...points.map(p => p[0])),
          top: Math.min(...points.map(p => p[1])),
          bottom: Math.max(...points.map(p => p[1])),
        };
      };

      // commonObjs is only filled once the page has drawn, hence the order.
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
          // Font metadata is a nicety; the run is editable without it.
        }

        raw.push({
          text,
          x: t[4],
          y: t[5],
          width: (item.width as number) || text.length * fontSize * 0.5,
          fontSize,
          sourceFont: fontName,
          ...styleFromFontName(fontName || (item.fontName as string) || ''),
        });
      }

      const blocks: TextBlock[] = joinRuns(raw).map((run, i) => {
        const { left, right, top, bottom } = canvasBox(
          run.x, run.y - run.fontSize * 0.24,
          run.x + run.width, run.y + run.fontSize * 0.82,
        );
        const background = sampleBackground(sampler, left, top, right, bottom);
        return {
          id: `p${index}-t${i}`,
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
          background,
          sourceFont: run.sourceFont || undefined,
          deleted: false,
          added: false,
        };
      });

      // Images come from the content stream, which is also what says where they
      // are drawn. The thumbnail is cut from the page we just rendered.
      const images: ImageObject[] = [];
      const bytes = pageContentBytes(lib, index);
      if (bytes && bytes.length > 0) {
        const scan = scanContentStream(bytes, imageNamesFor(lib, index));
        scan.images.forEach((placement, i) => {
          const box: Box = {
            x: placement.x,
            y: placement.y,
            width: placement.width,
            height: placement.height,
          };
          images.push({
            id: `p${index}-i${i}`,
            page: index,
            box,
            originalBox: { ...box },
            rotated: placement.rotated,
            opIndex: placement.opIndex,
            thumbnail: cropThumbnail(canvas, canvasBox(box.x, box.y, box.x + box.width, box.y + box.height)),
            deleted: false,
            replacement: null,
          });
        });
      }

      // The page's own fonts, repaired enough for the browser to load them, so
      // text typed on the page is set in the face the document actually uses.
      const fonts: EditorFont[] = [];
      try {
        for (const [key, embedded] of collectEmbeddedFonts(lib, lib.getPage(index))) {
          const program = repairFontProgram(embedded.bytes, embedded.charToGlyph, embedded.postscriptName);
          if (program) fonts.push({ key, bytes: program });
        }
      } catch {
        // Without them the editor falls back to a lookalike system font.
      }

      const loaded: LoadedPage = {
        index,
        width: base.width,
        height: base.height,
        transform: base.transform as number[],
        image: canvas.toDataURL('image/jpeg', 0.85),
        blocks,
        images,
        fonts,
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

interface CanvasBox { left: number; top: number; right: number; bottom: number }

function cropThumbnail(source: HTMLCanvasElement, area: CanvasBox): string {
  const width = Math.max(1, Math.round(area.right - area.left));
  const height = Math.max(1, Math.round(area.bottom - area.top));
  const left = Math.round(area.left);
  const top = Math.round(area.top);

  const out = document.createElement('canvas');
  const cap = 240;
  const ratio = Math.min(1, cap / Math.max(width, height));
  out.width = Math.max(1, Math.round(width * ratio));
  out.height = Math.max(1, Math.round(height * ratio));
  out.getContext('2d')!.drawImage(source, left, top, width, height, 0, 0, out.width, out.height);
  return out.toDataURL('image/jpeg', 0.8);
}

/** Nudge a substitute font's size so it holds the width the original occupied. */
function fitSize(measured: number, desired: number, targetWidth: number): number {
  if (targetWidth <= 0 || measured <= 0) return desired;
  const ratio = targetWidth / measured;
  return ratio > 0.8 && ratio < 1.25 ? desired * ratio : desired;
}

async function embedPicture(doc: PDFDocument, dataUrl: string) {
  const bytes = await fetch(dataUrl).then(r => r.arrayBuffer());
  if (dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/jpg')) {
    return doc.embedJpg(bytes);
  }
  return doc.embedPng(bytes);
}

export interface BuildResult {
  bytes: Uint8Array;
  /** Pages whose whole text layer had to be rebuilt rather than edited in place. */
  rebuiltPages: number[];
  /** True when at least one run had to fall back to a substitute font. */
  substituted: boolean;
}

/**
 * Write the edits into the document.
 *
 * Only pages carrying a change are touched at all, and within those pages only
 * the operators behind the changed text and images are removed. If a run cannot
 * be located in the stream — which happens with unusual producers — that page
 * falls back to rebuilding its whole text layer, which is reported so the
 * interface can say the page was redrawn.
 */
export async function buildEditedPdf(
  file: File,
  blocks: TextBlock[],
  images: ImageObject[] = [],
): Promise<BuildResult> {
  const buf = await readFileAsArrayBuffer(file);
  const doc = await loadPdf(buf);

  const changedPages = new Set<number>([
    ...blocks.filter(isChanged).map(b => b.page),
    ...images.filter(isImageChanged).map(i => i.page),
  ]);
  if (changedPages.size === 0) {
    return { bytes: await doc.save(), rebuiltPages: [], substituted: false };
  }

  const fonts = new FontResolver(doc);
  const rebuiltPages: number[] = [];
  let substituted = false;

  for (const pageIndex of changedPages) {
    if (pageIndex < 0 || pageIndex >= doc.getPageCount()) continue;
    const page = doc.getPage(pageIndex);
    fonts.addPageFonts(collectEmbeddedFonts(doc, page));

    const pageBlocks = blocks.filter(b => b.page === pageIndex);
    const pageImages = images.filter(i => i.page === pageIndex);
    const bytes = pageContentBytes(doc, pageIndex);

    if (!bytes) {
      throw new Error(
        `Page ${pageIndex + 1} uses a content stream this tool cannot rewrite, so its contents cannot be edited.`,
      );
    }

    const scan = scanContentStream(bytes, imageNamesFor(doc, pageIndex));

    // Work out which show operators sit behind each block.
    const showsForBlock = new Map<string, number[]>();
    for (const block of pageBlocks) {
      if (block.added) continue;
      const matches = scan.shows
        .filter(show =>
          show.x >= block.x - 1.5 &&
          show.x <= block.x + Math.max(block.width, 1) + 1.5 &&
          Math.abs(show.y - block.y) <= Math.max(1.5, block.fontSize * 0.5))
        .map(show => show.opIndex);
      showsForBlock.set(block.id, matches);
    }

    const changedBlocks = pageBlocks.filter(isChanged);
    const unmatched = changedBlocks.some(b => !b.added && (showsForBlock.get(b.id)?.length ?? 0) === 0);

    let redraw: TextBlock[];
    const plan: Parameters<typeof rewriteContentStream>[2] = {};

    if (unmatched) {
      // Could not place every edit in the stream: rebuild the page's text.
      plan.removeAllText = true;
      redraw = pageBlocks;
      rebuiltPages.push(pageIndex);
    } else {
      const removeShows = new Set<number>();
      for (const block of changedBlocks) for (const op of showsForBlock.get(block.id) ?? []) removeShows.add(op);
      // A single operator can carry more than one block. Redraw every block it
      // covered, or the untouched half of it would vanish.
      const affected = new Set(changedBlocks.map(b => b.id));
      for (const block of pageBlocks) {
        if (affected.has(block.id) || block.added) continue;
        if ((showsForBlock.get(block.id) ?? []).some(op => removeShows.has(op))) affected.add(block.id);
      }
      plan.removeShows = removeShows;
      redraw = pageBlocks.filter(b => affected.has(b.id));
    }

    const removeImages = new Set<number>();
    const transformImages = new Map<number, Matrix>();
    for (const image of pageImages) {
      if (!isImageChanged(image)) continue;
      if (image.deleted || image.replacement) {
        removeImages.add(image.opIndex);
        continue;
      }
      const placement = scan.images.find(p => p.opIndex === image.opIndex);
      if (!placement) continue;
      const target: Matrix = [
        image.box.width, 0, 0, image.box.height, image.box.x, image.box.y,
      ];
      const inverse = invert(placement.ctm);
      if (inverse) transformImages.set(image.opIndex, multiply(target, inverse));
    }
    plan.removeImages = removeImages;
    plan.transformImages = transformImages;

    const rewritten = rewriteContentStream(bytes, scan, plan);
    page.node.set(PDFName.of('Contents'), doc.context.register(doc.context.flateStream(rewritten)));

    // Draw the replacements.
    for (const block of redraw) {
      if (block.deleted) continue;
      const resolved = await fonts.resolve(
        { sourceFont: block.sourceFont, family: block.family, bold: block.bold, italic: block.italic },
        block.text,
      );
      const text = resolved.original ? block.text : toWinAnsi(block.text).text;
      if (!text.trim()) continue;
      if (!resolved.original) substituted = true;

      const size = isChanged(block)
        ? block.fontSize
        : fitSize(resolved.font.widthOfTextAtSize(text, block.fontSize), block.fontSize, block.width);

      page.drawText(text, {
        x: block.x,
        y: block.y,
        size,
        font: resolved.font,
        color: rgb(block.color.r / 255, block.color.g / 255, block.color.b / 255),
      });
    }

    for (const image of pageImages) {
      if (!image.replacement || image.deleted) continue;
      try {
        const embedded = await embedPicture(doc, image.replacement.dataUrl);
        page.drawImage(embedded, {
          x: image.box.x,
          y: image.box.y,
          width: image.box.width,
          height: image.box.height,
        });
      } catch {
        throw new Error(`"${image.replacement.name}" could not be placed — try a PNG or JPEG.`);
      }
    }
  }

  return { bytes: await doc.save(), rebuiltPages, substituted };
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
