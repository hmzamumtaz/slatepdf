'use client';

/**
 * Repairing font programmes pulled out of a PDF.
 *
 * A font embedded in a PDF is not a font file you could install. Producers
 * subset it down to the glyphs the document actually draws and throw away the
 * tables the PDF itself does not need — `name`, `cmap` and `post` are routinely
 * missing, because a composite font is addressed by glyph id, not by character.
 *
 * fontkit refuses such a programme, so reusing the document's own font would be
 * impossible. The tables can be rebuilt though: the font dictionary carries a
 * ToUnicode map, which is exactly the character-to-glyph table `cmap` wants,
 * only inverted. Splicing those back in turns the subset into a font that can be
 * parsed, measured and re-embedded — with a character set that honestly reports
 * the handful of glyphs the subset really contains.
 */

interface Sfnt {
  version: number;
  tables: Map<string, Uint8Array>;
}

/** True for a wrapped TrueType/OpenType programme (as opposed to bare CFF). */
function isSfnt(bytes: Uint8Array): boolean {
  if (bytes.length < 12) return false;
  const tag = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
  return tag === '\x00\x01\x00\x00' || tag === 'true' || tag === 'ttcf' || tag === 'OTTO';
}

function readSfnt(bytes: Uint8Array): Sfnt | null {
  try {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const count = view.getUint16(4);
    if (count === 0 || count > 512) return null;
    const tables = new Map<string, Uint8Array>();
    for (let i = 0; i < count; i++) {
      const record = 12 + i * 16;
      if (record + 16 > bytes.length) return null;
      const tag = String.fromCharCode(bytes[record], bytes[record + 1], bytes[record + 2], bytes[record + 3]);
      const offset = view.getUint32(record + 8);
      const length = view.getUint32(record + 12);
      if (offset + length > bytes.length) return null;
      tables.set(tag, bytes.subarray(offset, offset + length));
    }
    return { version: view.getUint32(0), tables };
  } catch {
    return null;
  }
}

function writeSfnt({ version, tables }: Sfnt): Uint8Array {
  const tags = [...tables.keys()].sort();
  const padding = (n: number) => (4 - (n % 4)) % 4;
  const headerSize = 12 + tags.length * 16;

  let total = headerSize;
  for (const tag of tags) {
    const data = tables.get(tag)!;
    total += data.length + padding(data.length);
  }

  const out = new Uint8Array(total);
  const view = new DataView(out.buffer);
  const power = Math.pow(2, Math.floor(Math.log2(tags.length)));
  view.setUint32(0, version);
  view.setUint16(4, tags.length);
  view.setUint16(6, power * 16);
  view.setUint16(8, Math.log2(power));
  view.setUint16(10, tags.length * 16 - power * 16);

  let offset = headerSize;
  tags.forEach((tag, i) => {
    const record = 12 + i * 16;
    for (let k = 0; k < 4; k++) out[record + k] = tag.charCodeAt(k);
    const data = tables.get(tag)!;

    let checksum = 0;
    for (let k = 0; k + 3 < data.length; k += 4) {
      checksum = (checksum + ((data[k] << 24) | (data[k + 1] << 16) | (data[k + 2] << 8) | data[k + 3])) >>> 0;
    }
    view.setUint32(record + 4, checksum >>> 0);
    view.setUint32(record + 8, offset);
    view.setUint32(record + 12, data.length);

    out.set(data, offset);
    offset += data.length + padding(data.length);
  });

  return out;
}

/** A format 4 `cmap` built from the character-to-glyph pairs we recovered. */
function buildCmap(charToGlyph: Map<number, number>): Uint8Array | null {
  const codes = [...charToGlyph.keys()].filter(c => c > 0 && c <= 0xffff).sort((a, b) => a - b);
  if (codes.length === 0) return null;

  const segments: Array<{ start: number; end: number; delta: number }> = [];
  let start = codes[0];
  let previous = codes[0];
  let delta = (charToGlyph.get(codes[0])! - codes[0]) & 0xffff;

  for (let i = 1; i < codes.length; i++) {
    const code = codes[i];
    const next = (charToGlyph.get(code)! - code) & 0xffff;
    if (code === previous + 1 && next === delta) {
      previous = code;
      continue;
    }
    segments.push({ start, end: previous, delta });
    start = code;
    previous = code;
    delta = next;
  }
  segments.push({ start, end: previous, delta });
  segments.push({ start: 0xffff, end: 0xffff, delta: 1 });

  const segCount = segments.length;
  const sub = new Uint8Array(16 + segCount * 8);
  const view = new DataView(sub.buffer);
  const power = Math.pow(2, Math.floor(Math.log2(segCount)));

  view.setUint16(0, 4);
  view.setUint16(2, sub.length);
  view.setUint16(4, 0);
  view.setUint16(6, segCount * 2);
  view.setUint16(8, power * 2);
  view.setUint16(10, Math.log2(power));
  view.setUint16(12, segCount * 2 - power * 2);

  segments.forEach((segment, i) => {
    view.setUint16(14 + i * 2, segment.end);
    view.setUint16(16 + segCount * 2 + i * 2, segment.start);
    view.setInt16(16 + segCount * 4 + i * 2, segment.delta > 0x7fff ? segment.delta - 0x10000 : segment.delta);
    view.setUint16(16 + segCount * 6 + i * 2, 0);
  });
  view.setUint16(14 + segCount * 2, 0); // reservedPad

  const table = new Uint8Array(12 + sub.length);
  const header = new DataView(table.buffer);
  header.setUint16(0, 0);
  header.setUint16(2, 1);
  header.setUint16(4, 3); // Windows
  header.setUint16(6, 1); // Unicode BMP
  header.setUint32(8, 12);
  table.set(sub, 12);
  return table;
}

/** A minimal Windows-only `name` table — enough for fontkit to identify the face. */
function buildName(postscriptName: string): Uint8Array {
  const safe = postscriptName.replace(/[^\x20-\x7e]/g, '') || 'EmbeddedFont';
  const entries: Array<{ id: number; bytes: Uint8Array }> = [
    [1, safe], [2, 'Regular'], [4, safe], [6, safe],
  ].map(([id, value]) => {
    const text = value as string;
    const bytes = new Uint8Array(text.length * 2);
    for (let i = 0; i < text.length; i++) {
      bytes[i * 2] = 0;
      bytes[i * 2 + 1] = text.charCodeAt(i);
    }
    return { id: id as number, bytes };
  });

  const storage = 6 + entries.length * 12;
  const table = new Uint8Array(storage + entries.reduce((n, e) => n + e.bytes.length, 0));
  const view = new DataView(table.buffer);
  view.setUint16(0, 0);
  view.setUint16(2, entries.length);
  view.setUint16(4, storage);

  let offset = 0;
  entries.forEach((entry, i) => {
    const record = 6 + i * 12;
    view.setUint16(record, 3);
    view.setUint16(record + 2, 1);
    view.setUint16(record + 4, 0x0409);
    view.setUint16(record + 6, entry.id);
    view.setUint16(record + 8, entry.bytes.length);
    view.setUint16(record + 10, offset);
    table.set(entry.bytes, storage + offset);
    offset += entry.bytes.length;
  });

  return table;
}

/**
 * Put back the tables a subsetter removed. Returns the programme unchanged when
 * nothing is missing, and null when it is not something we can repair.
 */
export function repairFontProgram(
  bytes: Uint8Array,
  charToGlyph: Map<number, number>,
  postscriptName: string,
): Uint8Array | null {
  if (!isSfnt(bytes)) return bytes; // Bare CFF — fontkit reads it directly.
  const sfnt = readSfnt(bytes);
  if (!sfnt) return null;

  let repaired = false;

  if (!sfnt.tables.has('name')) {
    sfnt.tables.set('name', buildName(postscriptName));
    repaired = true;
  }

  if (!sfnt.tables.has('cmap')) {
    const cmap = buildCmap(charToGlyph);
    if (!cmap) return null; // No way to address the glyphs by character.
    sfnt.tables.set('cmap', cmap);
    repaired = true;
  }

  if (!sfnt.tables.has('post')) {
    const post = new Uint8Array(32);
    new DataView(post.buffer).setUint32(0, 0x00030000); // version 3: no glyph names
    sfnt.tables.set('post', post);
    repaired = true;
  }

  return repaired ? writeSfnt(sfnt) : bytes;
}

/**
 * Read a ToUnicode CMap into character-code pairs. The stream is a small
 * PostScript program, but the only parts that matter are the bfchar and bfrange
 * blocks, which are strictly formatted.
 */
export function parseToUnicode(text: string): Map<number, number> {
  const map = new Map<number, number>();
  const hex = (value: string) => parseInt(value, 16);

  for (const block of text.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) {
    for (const pair of block[1].matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g)) {
      const target = pair[2];
      if (target.length > 4) continue; // Surrogate pair or ligature — not one character.
      const code = hex(target);
      if (code > 0 && !map.has(code)) map.set(code, hex(pair[1]));
    }
  }

  for (const block of text.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
    for (const range of block[1].matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>/g)) {
      const low = hex(range[1]);
      const high = hex(range[2]);
      const target = hex(range[3]);
      if (high < low || high - low > 0xffff) continue;
      for (let i = 0; i <= high - low; i++) {
        const code = target + i;
        if (code > 0 && !map.has(code)) map.set(code, low + i);
      }
    }
  }

  return map;
}
