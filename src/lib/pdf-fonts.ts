'use client';

import fontkit from '@pdf-lib/fontkit';
import {
  StandardFonts, PDFArray, PDFDict, PDFName, PDFRawStream, decodePDFRawStream,
  type PDFDocument, type PDFFont, type PDFPage,
} from 'pdf-lib';
import { repairFontProgram, parseToUnicode } from './sfnt';

/**
 * Fonts for redrawn text.
 *
 * The best result by far is to reuse the font the document already carries, so
 * edited words look like the words beside them. That is possible when the font
 * is embedded as TrueType or OpenType and its subset happens to contain the
 * characters being typed — neither is guaranteed, which is why every lookup can
 * fall back to a standard PDF font and say that it did.
 */

export type FontFamily = 'Helvetica' | 'Times' | 'Courier';

const STANDARD: Record<FontFamily, Record<string, StandardFonts>> = {
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

export interface FontRequest {
  /** PostScript name of the font the run originally used, if known. */
  sourceFont?: string;
  family: FontFamily;
  bold: boolean;
  italic: boolean;
}

export interface ResolvedFont {
  font: PDFFont;
  /** True when the document's own font is being used rather than a substitute. */
  original: boolean;
}

const weightOf = (r: Pick<FontRequest, 'bold' | 'italic'>) =>
  `${r.bold ? 'bold' : ''}${r.italic ? 'italic' : ''}` || 'regular';

/** Subset fonts are named like "ABCDEF+Arial-BoldMT"; the tag is not identity. */
export function normaliseFontName(name: string): string {
  return name.replace(/^[A-Z]{6}\+/, '').replace(/^\//, '').toLowerCase();
}

function streamBytes(value: unknown): Uint8Array | null {
  if (!(value instanceof PDFRawStream)) return null;
  try {
    return decodePDFRawStream(value).decode();
  } catch {
    return null;
  }
}

/** An embedded programme plus the character map recovered alongside it. */
export interface EmbeddedFont {
  bytes: Uint8Array;
  /** Unicode code point to glyph id, rebuilt from the font's ToUnicode map. */
  charToGlyph: Map<number, number>;
  postscriptName: string;
}

/**
 * Pull every embeddable font program out of a page's resources, keyed by the
 * PostScript name pdf.js reports for the runs that use it.
 */
export function collectEmbeddedFonts(doc: PDFDocument, page: PDFPage): Map<string, EmbeddedFont> {
  const found = new Map<string, EmbeddedFont>();
  let fonts: PDFDict | undefined;
  try {
    fonts = page.node.Resources()?.lookup(PDFName.of('Font'), PDFDict);
  } catch {
    return found;
  }
  if (!fonts) return found;

  const programOf = (descriptor: PDFDict): Uint8Array | null => {
    for (const key of ['FontFile2', 'FontFile3']) {
      try {
        const bytes = streamBytes(doc.context.lookup(descriptor.get(PDFName.of(key))));
        if (bytes && bytes.length > 0) return bytes;
      } catch {
        // Unreadable programme; the standard fallback covers it.
      }
    }
    return null;
  };

  /** Composite fonts may remap character ids onto glyph ids through a stream. */
  const glyphMapper = (child: PDFDict | null): ((cid: number) => number) => {
    if (!child) return cid => cid;
    try {
      const bytes = streamBytes(doc.context.lookup(child.get(PDFName.of('CIDToGIDMap'))));
      if (!bytes) return cid => cid;
      return cid => {
        const at = cid * 2;
        return at + 1 < bytes.length ? (bytes[at] << 8) | bytes[at + 1] : 0;
      };
    } catch {
      return cid => cid;
    }
  };

  const visit = (dict: PDFDict) => {
    let raw = '';
    try {
      const base = dict.get(PDFName.of('BaseFont'));
      if (base) raw = base.toString().replace(/^\//, '');
    } catch {
      return;
    }
    if (!raw) return;
    const baseFont = normaliseFontName(raw);

    const descriptors: Array<{ dict: PDFDict; child: PDFDict | null }> = [];
    try {
      const own = dict.lookupMaybe(PDFName.of('FontDescriptor'), PDFDict);
      if (own) descriptors.push({ dict: own, child: null });
    } catch {
      // Not every font dictionary has one.
    }

    // A Type0 font keeps its programme on the descendant it delegates to.
    try {
      const descendants = doc.context.lookup(dict.get(PDFName.of('DescendantFonts')));
      const entries = descendants instanceof PDFArray ? descendants.asArray() : [];
      for (const entry of entries) {
        const child = doc.context.lookup(entry);
        if (!(child instanceof PDFDict)) continue;
        const childDescriptor = child.lookupMaybe(PDFName.of('FontDescriptor'), PDFDict);
        if (childDescriptor) descriptors.push({ dict: childDescriptor, child });
      }
    } catch {
      // Composite fonts we cannot walk simply fall back.
    }

    let toUnicode = new Map<number, number>();
    try {
      const stream = streamBytes(doc.context.lookup(dict.get(PDFName.of('ToUnicode'))));
      if (stream) toUnicode = parseToUnicode(new TextDecoder().decode(stream));
    } catch {
      // Without it we can still use a programme that kept its own cmap.
    }

    for (const { dict: descriptor, child } of descriptors) {
      const bytes = programOf(descriptor);
      if (!bytes) continue;
      const toGlyph = glyphMapper(child);
      const charToGlyph = new Map<number, number>();
      for (const [code, cid] of toUnicode) charToGlyph.set(code, toGlyph(cid));
      found.set(baseFont, { bytes, charToGlyph, postscriptName: raw.replace(/^[A-Z]{6}\+/, '') });
      return;
    }
  };

  for (const [, value] of fonts.entries()) {
    try {
      const dict = doc.context.lookup(value);
      if (dict instanceof PDFDict) visit(dict);
    } catch {
      // Skip fonts that cannot be resolved.
    }
  }

  return found;
}

/**
 * Resolves a font for drawing, preferring the document's own and checking it can
 * actually render the characters asked for before committing to it.
 */
export class FontResolver {
  private cache = new Map<string, ResolvedFont>();
  private embedded = new Map<string, EmbeddedFont>();
  private failed = new Set<string>();
  private fontkitRegistered = false;

  constructor(private doc: PDFDocument) {}

  addPageFonts(programs: Map<string, EmbeddedFont>) {
    for (const [name, bytes] of programs) if (!this.embedded.has(name)) this.embedded.set(name, bytes);
  }

  private async standard(request: FontRequest): Promise<PDFFont> {
    const key = `std:${request.family}:${weightOf(request)}`;
    const hit = this.cache.get(key);
    if (hit) return hit.font;
    const font = await this.doc.embedFont(STANDARD[request.family][weightOf(request)]);
    this.cache.set(key, { font, original: false });
    return font;
  }

  async resolve(request: FontRequest, text: string): Promise<ResolvedFont> {
    const name = request.sourceFont ? normaliseFontName(request.sourceFont) : '';
    const source = name ? this.embedded.get(name) : undefined;

    if (source && !this.failed.has(name)) {
      const key = `emb:${name}`;
      let resolved = this.cache.get(key);
      if (!resolved) {
        try {
          if (!this.fontkitRegistered) {
            this.doc.registerFontkit(fontkit);
            this.fontkitRegistered = true;
          }
          const program = repairFontProgram(source.bytes, source.charToGlyph, source.postscriptName);
          if (!program) throw new Error('unrepairable font programme');
          const font = await this.doc.embedFont(program, { subset: false });
          resolved = { font, original: true };
          this.cache.set(key, resolved);
        } catch {
          this.failed.add(name);
        }
      }

      if (resolved && this.covers(resolved.font, text)) return resolved;
    }

    return { font: await this.standard(request), original: false };
  }

  /** A subset font only carries the glyphs the document happened to use. */
  private covers(font: PDFFont, text: string): boolean {
    try {
      const set = new Set(font.getCharacterSet());
      for (const ch of text) {
        const code = ch.codePointAt(0)!;
        if (code === 0x20) continue;
        if (!set.has(code)) return false;
      }
      font.widthOfTextAtSize(text, 12);
      return true;
    } catch {
      return false;
    }
  }
}
