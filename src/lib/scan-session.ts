'use client';

/**
 * The scanner's page model, renderer and on-device persistence.
 *
 * A page never stores only its finished image. It keeps the original photo
 * plus every edit as data — crop corners, rotation, filter, adjustments,
 * cleanup strokes — so any edit can be changed later without losing quality,
 * and the finished image is re-rendered from the original each time.
 */

import {
  warpCanvas, applyFilter, rotateCanvas, applyCleanup, composeIdCard, releaseCanvas,
  type Corner, type ScanFilter, type CleanupStroke,
} from './document-scanner';

export const FULL_QUAD: Corner[] = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }];

/** One captured photo and the area of it that is the document. */
export interface PagePart {
  source: Blob;
  quad: Corner[];
  /** The corners found when the photo was taken — what "Revert" goes back to. */
  autoQuad?: Corner[];
}

/** single: a page · id-card: front + back of a card on one A4 page · card: a business card, cropped to the card. */
export type PageLayout = 'single' | 'id-card' | 'card';

/**
 * Markup drawn on a page. Positions are normalized to the page *before*
 * rotation; sizes are fractions of the page's long side; `angle` keeps text
 * and signatures upright relative to how the page was shown when they were
 * placed.
 */
export type PageMark =
  | { kind: 'pen'; points: Corner[]; width: number; color: string }
  | { kind: 'highlight'; points: Corner[]; width: number; color: string }
  | { kind: 'text'; x: number; y: number; text: string; size: number; color: string; angle: number }
  | { kind: 'image'; x: number; y: number; w: number; aspect: number; src: string; angle: number };

export interface PageEdits {
  rotation: number;
  filter: ScanFilter;
  brightness: number;
  contrast: number;
  strokes: CleanupStroke[];
  marks: PageMark[];
}

export interface ScanPage extends PageEdits {
  id: number;
  /** One part, or front + back for an ID card. */
  parts: PagePart[];
  layout: PageLayout;
  /** Rendered result (JPEG) and its object URL. */
  out: Blob | null;
  url: string | null;
}

export const DEFAULT_EDITS: PageEdits = { rotation: 0, filter: 'enhance', brightness: 0, contrast: 0, strokes: [], marks: [] };

/* ------------------------------------------------------------------ *
 *  Decoding sources (with a tiny cache — phone photos are large)
 * ------------------------------------------------------------------ */

const decodeCache = new Map<Blob, HTMLCanvasElement>();
// Kept small on purpose: each decoded photo can hold ~30 MB of canvas memory.
const CACHE_LIMIT = 2;

export async function blobToCanvas(blob: Blob, maxSide = 3200): Promise<HTMLCanvasElement> {
  const cached = decodeCache.get(blob);
  if (cached && cached.width > 0 && Math.max(cached.width, cached.height) <= maxSide) {
    decodeCache.delete(blob);
    decodeCache.set(blob, cached);
    return cached;
  }
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(blob);
  } catch {
    // HEIC from an iPhone gallery outside Safari: convert first.
    try {
      const heic2any = (await import('heic2any')).default;
      const jpeg = await heic2any({ blob, toType: 'image/jpeg', quality: 0.92 }) as Blob;
      bitmap = await createImageBitmap(jpeg);
    } catch {
      throw new Error('This image could not be opened. Try a JPG or PNG photo.');
    }
  }
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(bitmap.width * scale));
  c.height = Math.max(1, Math.round(bitmap.height * scale));
  c.getContext('2d')?.drawImage(bitmap, 0, 0, c.width, c.height);
  bitmap.close();
  decodeCache.set(blob, c);
  while (decodeCache.size > CACHE_LIMIT) {
    const first = decodeCache.keys().next().value;
    if (first === undefined) break;
    releaseCanvas(decodeCache.get(first));
    decodeCache.delete(first);
  }
  return c;
}

export function canvasToJpeg(canvas: HTMLCanvasElement, quality = 0.9): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Could not encode the page image.'))), 'image/jpeg', quality);
  });
}

/* ------------------------------------------------------------------ *
 *  Markup
 * ------------------------------------------------------------------ */

const imageCache = new Map<string, Promise<HTMLImageElement>>();

function loadImage(src: string): Promise<HTMLImageElement> {
  let p = imageCache.get(src);
  if (!p) {
    p = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Could not load a signature image.'));
      img.src = src;
    });
    imageCache.set(src, p);
  }
  return p;
}

/** Draw markup onto a page canvas (pre-rotation coordinates). */
export async function applyMarks(canvas: HTMLCanvasElement, marks: PageMark[]): Promise<void> {
  if (marks.length === 0) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const W = canvas.width;
  const H = canvas.height;
  const long = Math.max(W, H);
  for (const m of marks) {
    ctx.save();
    if (m.kind === 'pen' || m.kind === 'highlight') {
      if (m.points.length === 0) { ctx.restore(); continue; }
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = m.color;
      ctx.fillStyle = m.color;
      ctx.lineWidth = m.width * long;
      if (m.kind === 'highlight') {
        ctx.globalAlpha = 0.38;
        ctx.globalCompositeOperation = 'multiply';
        ctx.lineCap = 'butt';
      }
      ctx.beginPath();
      if (m.points.length === 1) {
        ctx.arc(m.points[0].x * W, m.points[0].y * H, (m.width * long) / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.moveTo(m.points[0].x * W, m.points[0].y * H);
        for (const p of m.points.slice(1)) ctx.lineTo(p.x * W, p.y * H);
        ctx.stroke();
      }
    } else if (m.kind === 'text') {
      ctx.translate(m.x * W, m.y * H);
      ctx.rotate((m.angle * Math.PI) / 180);
      ctx.fillStyle = m.color;
      ctx.font = `600 ${Math.max(6, m.size * long)}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const lines = m.text.split('\n');
      const lh = m.size * long * 1.2;
      lines.forEach((line, i) => ctx.fillText(line, 0, (i - (lines.length - 1) / 2) * lh));
    } else if (m.kind === 'image') {
      try {
        const img = await loadImage(m.src);
        const w = m.w * long;
        const h = w / m.aspect;
        ctx.translate(m.x * W, m.y * H);
        ctx.rotate((m.angle * Math.PI) / 180);
        ctx.drawImage(img, -w / 2, -h / 2, w, h);
      } catch { /* a broken signature image shouldn't break the page */ }
    }
    ctx.restore();
  }
}

/* ------------------------------------------------------------------ *
 *  Rendering
 * ------------------------------------------------------------------ */

/** The page before rotation and markup: straightened, composed and filtered. */
async function renderBase(page: Pick<ScanPage, 'parts' | 'layout' | 'filter' | 'brightness' | 'contrast'>, maxOut: number): Promise<HTMLCanvasElement> {
  const warped: HTMLCanvasElement[] = [];
  for (const part of page.parts) {
    const src = await blobToCanvas(part.source);
    const w = warpCanvas(src, part.quad, maxOut);
    if (!w) {
      warped.forEach(releaseCanvas);
      throw new Error('Could not straighten this page. Try adjusting the crop.');
    }
    warped.push(w);
  }
  const adjust = { brightness: page.brightness, contrast: page.contrast };
  if (page.layout === 'id-card') {
    // Filter each side on its own: the blank page around the cards would
    // otherwise skew each card's lighting correction.
    const sides = warped.map(c => applyFilter(c, page.filter, adjust));
    const composed = composeIdCard(sides[0], sides[1] ?? null);
    sides.forEach(releaseCanvas);
    return composed;
  }
  return applyFilter(warped[0], page.filter, adjust);
}

type RenderInput = Omit<ScanPage, 'id' | 'out' | 'url'>;

/** Render the finished page as a canvas (`maxOut` caps the long side). */
export async function renderPageCanvas(page: RenderInput, maxOut = 2400): Promise<HTMLCanvasElement> {
  const base = await renderBase(page, maxOut);
  // Cleanup and markup are stored in pre-rotation coordinates, so apply them first.
  applyCleanup(base, page.strokes);
  await applyMarks(base, page.marks ?? []);
  const out = rotateCanvas(base, page.rotation);
  if (out !== base) releaseCanvas(base);
  return out;
}

export async function renderPage(page: RenderInput, maxOut = 2400): Promise<Blob> {
  const c = await renderPageCanvas(page, maxOut);
  try {
    return await canvasToJpeg(c, 0.9);
  } finally {
    releaseCanvas(c);
  }
}

/** Small previews for the filter picker. */
export async function renderFilterPreview(page: ScanPage, filter: ScanFilter): Promise<string> {
  const c = await renderPageCanvas({ ...page, filter, strokes: [], marks: [] }, 360);
  try {
    return URL.createObjectURL(await canvasToJpeg(c, 0.75));
  } finally {
    releaseCanvas(c);
  }
}

/** Map a point on the pre-rotation page to where it shows on the rotated page. */
export function rotatePoint(p: Corner, rotation: number): Corner {
  const r = ((rotation % 360) + 360) % 360;
  if (r === 90) return { x: 1 - p.y, y: p.x };
  if (r === 180) return { x: 1 - p.x, y: 1 - p.y };
  if (r === 270) return { x: p.y, y: 1 - p.x };
  return p;
}

/** Map a point on the rotated (displayed) page back to pre-rotation coordinates. */
export function unrotatePoint(p: Corner, rotation: number): Corner {
  const r = ((rotation % 360) + 360) % 360;
  if (r === 90) return { x: p.y, y: 1 - p.x };
  if (r === 180) return { x: 1 - p.x, y: 1 - p.y };
  if (r === 270) return { x: 1 - p.y, y: p.x };
  return p;
}

/* ------------------------------------------------------------------ *
 *  Export sizing
 * ------------------------------------------------------------------ */

export type ScanQuality = 'high' | 'medium' | 'small';

export const QUALITY_SETTINGS: Record<ScanQuality, { label: string; hint: string; maxSide: number; jpeg: number }> = {
  high: { label: 'High', hint: 'Sharpest, largest file', maxSide: 2400, jpeg: 0.9 },
  medium: { label: 'Medium', hint: 'Good for email', maxSide: 1800, jpeg: 0.78 },
  small: { label: 'Small', hint: 'Smallest file, still readable', maxSide: 1300, jpeg: 0.6 },
};

export async function pageForExport(page: ScanPage, quality: ScanQuality): Promise<Blob> {
  const q = QUALITY_SETTINGS[quality];
  const canvas = await renderPageCanvas(page, q.maxSide);
  try {
    return await canvasToJpeg(canvas, q.jpeg);
  } finally {
    releaseCanvas(canvas);
  }
}

/* ------------------------------------------------------------------ *
 *  Persistence (IndexedDB, this device only)
 * ------------------------------------------------------------------ */

const DB_NAME = 'slatepdf-scan';
const STORE = 'session';
const KEY = 'current';

export interface SavedSession {
  docName: string;
  pages: Omit<ScanPage, 'url'>[];
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveSession(session: SavedSession): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(session, KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    /* private mode or storage blocked: the scan still works, it just won't survive a reload */
  }
}

export async function loadSession(): Promise<SavedSession | null> {
  try {
    const db = await openDb();
    const value = await new Promise<SavedSession | null>((resolve, reject) => {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(KEY);
      req.onsuccess = () => resolve((req.result as SavedSession | undefined) ?? null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    if (!value || !Array.isArray(value.pages)) return null;
    return value;
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  await saveSession({ docName: '', pages: [] });
}

/** Default file name, like "Scan 2026-10-04 14.05". */
export function defaultDocName(date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `Scan ${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())} ${p(date.getHours())}.${p(date.getMinutes())}`;
}
