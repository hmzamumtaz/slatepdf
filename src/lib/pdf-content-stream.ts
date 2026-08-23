/**
 * A reader and rewriter for PDF page content streams.
 *
 * Everything drawn on a page — every glyph, line, fill and image — is a stream
 * of operators. Editing a PDF properly means changing those operators rather
 * than painting over the result, so this tokenises a stream, works out where
 * each piece of text and each image actually lands on the page, and can write
 * the stream back with pieces removed, moved or repointed.
 */

export type Matrix = [number, number, number, number, number, number];

export const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];

/** PDF applies the new matrix first: result = a then b. */
export function multiply(a: Matrix, b: Matrix): Matrix {
  return [
    a[0] * b[0] + a[1] * b[2],
    a[0] * b[1] + a[1] * b[3],
    a[2] * b[0] + a[3] * b[2],
    a[2] * b[1] + a[3] * b[3],
    a[4] * b[0] + a[5] * b[2] + b[4],
    a[4] * b[1] + a[5] * b[3] + b[5],
  ];
}

export function invert(m: Matrix): Matrix | null {
  const det = m[0] * m[3] - m[1] * m[2];
  if (!det || !Number.isFinite(det)) return null;
  return [
    m[3] / det,
    -m[1] / det,
    -m[2] / det,
    m[0] / det,
    (m[2] * m[5] - m[3] * m[4]) / det,
    (m[1] * m[4] - m[0] * m[5]) / det,
  ];
}

export function apply(m: Matrix, x: number, y: number): [number, number] {
  return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
}

export function formatMatrix(m: Matrix): string {
  return m.map(v => (Math.round(v * 10000) / 10000).toString()).join(' ');
}

type TokenKind = 'space' | 'comment' | 'string' | 'hex' | 'inline-image' | 'word';

export interface Token {
  kind: TokenKind;
  start: number;
  end: number;
  /** Only set for `word` tokens — operators, numbers and /Names. */
  text: string;
}

const DELIMITERS = new Set([0x20, 0x0a, 0x0d, 0x09, 0x0c, 0x00, 0x2f, 0x5b, 0x5d, 0x3c, 0x3e, 0x28, 0x29, 0x7b, 0x7d, 0x25]);
const isDelimiter = (b: number) => DELIMITERS.has(b);
const isWhitespace = (b: number) => b === 0x20 || b === 0x0a || b === 0x0d || b === 0x09 || b === 0x0c || b === 0x00;

/**
 * Split a stream into tokens covering every byte, so it can be rebuilt exactly.
 * Strings, hex strings, comments and inline image data are kept whole — any of
 * them can contain bytes that would otherwise look like operators.
 */
export function tokenize(input: Uint8Array): Token[] {
  const tokens: Token[] = [];
  const n = input.length;
  let i = 0;

  const push = (kind: TokenKind, start: number, end: number, text = '') =>
    tokens.push({ kind, start, end, text });

  while (i < n) {
    const c = input[i];

    if (isWhitespace(c)) {
      const start = i;
      while (i < n && isWhitespace(input[i])) i++;
      push('space', start, i);
      continue;
    }

    if (c === 0x25) {
      const start = i;
      while (i < n && input[i] !== 0x0a && input[i] !== 0x0d) i++;
      push('comment', start, i);
      continue;
    }

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
      push('string', start, i);
      continue;
    }

    if (c === 0x3c && input[i + 1] !== 0x3c) {
      const start = i;
      i++;
      while (i < n && input[i] !== 0x3e) i++;
      i++;
      push('hex', start, i);
      continue;
    }

    // Array and dictionary punctuation are their own words so operand counting
    // never confuses them with values.
    if (c === 0x5b || c === 0x5d || c === 0x7b || c === 0x7d) {
      push('word', i, i + 1, String.fromCharCode(c));
      i++;
      continue;
    }

    if (c === 0x3c && input[i + 1] === 0x3c) {
      push('word', i, i + 2, '<<');
      i += 2;
      continue;
    }

    if (c === 0x3e && input[i + 1] === 0x3e) {
      push('word', i, i + 2, '>>');
      i += 2;
      continue;
    }

    if (c === 0x2f) {
      const start = i;
      i++;
      while (i < n && !isDelimiter(input[i])) i++;
      push('word', start, i, latin1(input, start, i));
      continue;
    }

    const start = i;
    while (i < n && !isDelimiter(input[i])) i++;
    if (i === start) i++; // never stall on an unexpected delimiter
    const text = latin1(input, start, i);

    if (text === 'BI') {
      // Inline image: the binary payload between ID and EI can hold anything.
      while (i < n - 1 && !(input[i] === 0x49 && input[i + 1] === 0x44)) i++;
      i += 2;
      while (i < n - 1 && !(input[i] === 0x45 && input[i + 1] === 0x49 && isWhitespace(input[i - 1]))) i++;
      i += 2;
      push('inline-image', start, Math.min(i, n));
      continue;
    }

    push('word', start, i, text);
  }

  return tokens;
}

function latin1(bytes: Uint8Array, start: number, end: number): string {
  let out = '';
  for (let i = start; i < end; i++) out += String.fromCharCode(bytes[i]);
  return out;
}

/** Where an image is drawn on the page, and which tokens put it there. */
export interface ImagePlacement {
  /** Resource name including the slash, e.g. "/Im0". */
  name: string;
  ctm: Matrix;
  /** Axis-aligned bounds in page points. */
  x: number;
  y: number;
  width: number;
  height: number;
  rotated: boolean;
  /** Index of the `Do` token, used to address this occurrence when rewriting. */
  opIndex: number;
  nameIndex: number;
}

/** Where a piece of text is drawn, in page points. */
export interface TextShow {
  x: number;
  y: number;
  fontSize: number;
  /** Index of the show operator (Tj, TJ, ' or "). */
  opIndex: number;
  /** Index of the first operand token belonging to it. */
  firstOperandIndex: number;
}

export interface StreamScan {
  tokens: Token[];
  images: ImagePlacement[];
  shows: TextShow[];
}

const SHOW_OPERATORS = new Set(['Tj', 'TJ', "'", '"']);

/**
 * Walk a content stream keeping the graphics and text state, recording where
 * every image and every run of text is actually painted.
 */
export function scanContentStream(bytes: Uint8Array, imageNames: Set<string>): StreamScan {
  const tokens = tokenize(bytes);
  const images: ImagePlacement[] = [];
  const shows: TextShow[] = [];

  let ctm: Matrix = [...IDENTITY] as Matrix;
  const stack: Matrix[] = [];

  let textMatrix: Matrix = [...IDENTITY] as Matrix;
  let lineMatrix: Matrix = [...IDENTITY] as Matrix;
  let fontSize = 0;
  let leading = 0;

  // Operands accumulate until an operator consumes them.
  let operands: Array<{ value: number | null; index: number; text: string }> = [];

  const numbersFromEnd = (count: number): number[] | null => {
    if (operands.length < count) return null;
    const slice = operands.slice(operands.length - count);
    const values = slice.map(o => o.value);
    return values.every(v => v !== null) ? (values as number[]) : null;
  };

  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];
    if (token.kind !== 'word') {
      if (token.kind === 'string' || token.kind === 'hex') {
        operands.push({ value: null, index, text: '' });
      }
      continue;
    }

    const text = token.text;
    const asNumber = Number(text);
    if (text !== '' && Number.isFinite(asNumber) && /^[-+.\d]/.test(text)) {
      operands.push({ value: asNumber, index, text });
      continue;
    }
    if (text.startsWith('/') || text === '[' || text === ']' || text === '<<' || text === '>>') {
      operands.push({ value: null, index, text });
      continue;
    }

    switch (text) {
      case 'q':
        stack.push([...ctm] as Matrix);
        break;
      case 'Q':
        ctm = stack.pop() ?? ([...IDENTITY] as Matrix);
        break;
      case 'cm': {
        const m = numbersFromEnd(6);
        if (m) ctm = multiply(m as Matrix, ctm);
        break;
      }
      case 'BT':
        textMatrix = [...IDENTITY] as Matrix;
        lineMatrix = [...IDENTITY] as Matrix;
        break;
      case 'Tf': {
        const size = operands[operands.length - 1]?.value;
        if (typeof size === 'number') fontSize = size;
        break;
      }
      case 'TL': {
        const value = operands[operands.length - 1]?.value;
        if (typeof value === 'number') leading = value;
        break;
      }
      case 'Tm': {
        const m = numbersFromEnd(6);
        if (m) {
          lineMatrix = m as Matrix;
          textMatrix = [...lineMatrix] as Matrix;
        }
        break;
      }
      case 'Td': {
        const d = numbersFromEnd(2);
        if (d) {
          lineMatrix = multiply([1, 0, 0, 1, d[0], d[1]], lineMatrix);
          textMatrix = [...lineMatrix] as Matrix;
        }
        break;
      }
      case 'TD': {
        const d = numbersFromEnd(2);
        if (d) {
          leading = -d[1];
          lineMatrix = multiply([1, 0, 0, 1, d[0], d[1]], lineMatrix);
          textMatrix = [...lineMatrix] as Matrix;
        }
        break;
      }
      case 'T*':
        lineMatrix = multiply([1, 0, 0, 1, 0, -leading], lineMatrix);
        textMatrix = [...lineMatrix] as Matrix;
        break;
      case 'Do': {
        const name = operands[operands.length - 1];
        if (name && name.text.startsWith('/') && imageNames.has(name.text)) {
          const corners: Array<[number, number]> = [
            apply(ctm, 0, 0), apply(ctm, 1, 0), apply(ctm, 0, 1), apply(ctm, 1, 1),
          ];
          const xs = corners.map(c => c[0]);
          const ys = corners.map(c => c[1]);
          const x = Math.min(...xs);
          const y = Math.min(...ys);
          images.push({
            name: name.text,
            ctm: [...ctm] as Matrix,
            x,
            y,
            width: Math.max(...xs) - x,
            height: Math.max(...ys) - y,
            rotated: Math.abs(ctm[1]) > 0.01 || Math.abs(ctm[2]) > 0.01,
            opIndex: index,
            nameIndex: name.index,
          });
        }
        break;
      }
      default:
        if (SHOW_OPERATORS.has(text)) {
          if (text === "'" || text === '"') {
            lineMatrix = multiply([1, 0, 0, 1, 0, -leading], lineMatrix);
            textMatrix = [...lineMatrix] as Matrix;
          }
          const placed = multiply(textMatrix, ctm);
          shows.push({
            x: placed[4],
            y: placed[5],
            fontSize: fontSize * Math.hypot(placed[2], placed[3]) || fontSize,
            opIndex: index,
            firstOperandIndex: operands.length ? operands[0].index : index,
          });
        }
        break;
    }

    operands = [];
  }

  return { tokens, images, shows };
}

export interface RewritePlan {
  /** Show-operator token indices whose text should disappear. */
  removeShows?: Set<number>;
  /** Remove every BT…ET block, for pages that are rebuilt wholesale. */
  removeAllText?: boolean;
  /** `Do` token indices to drop entirely. */
  removeImages?: Set<number>;
  /** `Do` token indices to wrap in an extra transform. */
  transformImages?: Map<number, Matrix>;
}

/**
 * Write the stream back with the planned changes applied. Untouched bytes are
 * copied through exactly, so anything this does not deliberately alter is
 * preserved to the byte.
 */
export function rewriteContentStream(bytes: Uint8Array, scan: StreamScan, plan: RewritePlan): Uint8Array {
  const { tokens } = scan;
  const removeShows = plan.removeShows ?? new Set<number>();
  const removeImages = plan.removeImages ?? new Set<number>();
  const transformImages = plan.transformImages ?? new Map<number, Matrix>();

  // Which token indices are dropped, and what is inserted before/after them.
  const drop = new Set<number>();
  const before = new Map<number, string>();
  const after = new Map<number, string>();

  // A show operator and its operands go together.
  for (const show of scan.shows) {
    if (!removeShows.has(show.opIndex)) continue;
    for (let i = show.firstOperandIndex; i <= show.opIndex; i++) drop.add(i);
  }

  for (const image of scan.images) {
    if (removeImages.has(image.opIndex)) {
      drop.add(image.nameIndex);
      drop.add(image.opIndex);
      continue;
    }
    const matrix = transformImages.get(image.opIndex);
    if (matrix) {
      before.set(image.nameIndex, `q ${formatMatrix(matrix)} cm `);
      after.set(image.opIndex, ' Q');
    }
  }

  let textDepth = 0;
  const chunks: Uint8Array[] = [];
  const encoder = new TextEncoder();

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (plan.removeAllText && token.kind === 'word') {
      if (token.text === 'BT') { textDepth++; continue; }
      if (token.text === 'ET') { if (textDepth > 0) { textDepth--; continue; } }
    }
    if (textDepth > 0) continue;

    const prefix = before.get(i);
    if (prefix) chunks.push(encoder.encode(prefix));

    if (!drop.has(i)) chunks.push(bytes.subarray(token.start, token.end));

    const suffix = after.get(i);
    if (suffix) chunks.push(encoder.encode(suffix));
  }

  const total = chunks.reduce((sum, c) => sum + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}
