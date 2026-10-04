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
  warpCanvas, applyFilter, rotateCanvas, applyCleanup, composeIdCard,
  type Corner, type ScanFilter, type CleanupStroke,
} from './document-scanner';

export const FULL_QUAD: Corner[] = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }];

/** One captured photo and the area of it that is the document. */
export interface PagePart {
  source: Blob;
  quad: Corner[];
}

export type PageLayout = 'single' | 'id-card';

export interface PageEdits {
  rotation: number;
  filter: ScanFilter;
  brightness: number;
  contrast: number;
  strokes: CleanupStroke[];
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

export const DEFAULT_EDITS: PageEdits = { rotation: 0, filter: 'enhance', brightness: 0, contrast: 0, strokes: [] };

/* ------------------------------------------------------------------ *
 *  Decoding sources (with a tiny cache — phone photos are large)
 * ------------------------------------------------------------------ */

const decodeCache = new Map<Blob, HTMLCanvasElement>();
const CACHE_LIMIT = 4;

export async function blobToCanvas(blob: Blob, maxSide = 3200): Promise<HTMLCanvasElement> {
  const cached = decodeCache.get(blob);
  if (cached && Math.max(cached.width, cached.height) <= maxSide) {
    decodeCache.delete(blob);
    decodeCache.set(blob, cached);
    return cached;
  }
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(blob);
  } catch {
    // HEIC from an iPhone gallery outside Safari: convert first.
    const heic2any = (await import('heic2any')).default;
    const jpeg = await heic2any({ blob, toType: 'image/jpeg', quality: 0.92 }) as Blob;
    bitmap = await createImageBitmap(jpeg);
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
 *  Rendering
 * ------------------------------------------------------------------ */

/** The page before rotation and cleanup: straightened, composed and filtered. */
async function renderBase(page: Pick<ScanPage, 'parts' | 'layout' | 'filter' | 'brightness' | 'contrast'>, maxOut: number): Promise<HTMLCanvasElement> {
  const warped: HTMLCanvasElement[] = [];
  for (const part of page.parts) {
    const src = await blobToCanvas(part.source);
    const w = warpCanvas(src, part.quad, maxOut);
    if (!w) throw new Error('Could not straighten this page. Try adjusting the crop.');
    warped.push(w);
  }
  const adjust = { brightness: page.brightness, contrast: page.contrast };
  if (page.layout === 'id-card') {
    // Filter each side on its own: the blank page around the cards would
    // otherwise skew each card's lighting correction.
    const sides = warped.map(c => applyFilter(c, page.filter, adjust));
    return composeIdCard(sides[0], sides[1] ?? null);
  }
  return applyFilter(warped[0], page.filter, adjust);
}

/** Render the finished page as a canvas (`maxOut` caps the long side). */
export async function renderPageCanvas(page: Omit<ScanPage, 'id' | 'out' | 'url'>, maxOut = 2400): Promise<HTMLCanvasElement> {
  const base = await renderBase(page, maxOut);
  // Strokes are stored in pre-rotation coordinates, so apply them first.
  applyCleanup(base, page.strokes);
  return rotateCanvas(base, page.rotation);
}

export async function renderPage(page: Omit<ScanPage, 'id' | 'out' | 'url'>, maxOut = 2400): Promise<Blob> {
  return canvasToJpeg(await renderPageCanvas(page, maxOut), 0.9);
}

/** Small previews for the filter picker. */
export async function renderFilterPreview(page: ScanPage, filter: ScanFilter): Promise<string> {
  const c = await renderPageCanvas({ ...page, filter, strokes: [] }, 360);
  return URL.createObjectURL(await canvasToJpeg(c, 0.75));
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
  return canvasToJpeg(canvas, q.jpeg);
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
