/**
 * A small library of finished scans, kept in this browser's IndexedDB.
 * Nothing here ever leaves the device. Storage can be unavailable (private
 * browsing, blocked site data, quota), so every function swallows errors and
 * resolves to an empty result or a no-op instead of throwing.
 */

export interface SavedScan {
  id: string;
  name: string;
  createdAt: number;
  pages: number;
  /** Size of the PDF in bytes. */
  size: number;
  pdf: Blob;
  thumb: Blob | null;
  /** The PDF needs a password to open. */
  protected: boolean;
  /** The PDF has an OCR text layer. */
  searchable: boolean;
}

export type NewScan = Omit<SavedScan, 'id' | 'createdAt' | 'size'> & Partial<Pick<SavedScan, 'id' | 'createdAt' | 'size'>>;

const DB_NAME = 'slatepdf-scan-library';
const STORE = 'docs';
const MAX_DOCS = 50;
export const SCAN_LIBRARY_EVENT = 'scan-library-change';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('IndexedDB blocked'));
  });
}

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('Transaction aborted'));
  });
}

async function withStore<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => Promise<T>): Promise<T> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, mode);
    const finished = done(tx);
    const result = await fn(tx.objectStore(STORE));
    await finished;
    return result;
  } finally {
    db.close();
  }
}

function notify() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(SCAN_LIBRARY_EVENT));
}

function newId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

/** Every saved scan, newest first. */
export async function listScans(): Promise<SavedScan[]> {
  try {
    const all = await withStore('readonly', store => request(store.getAll() as IDBRequest<SavedScan[]>));
    return all.sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

export async function getScan(id: string): Promise<SavedScan | null> {
  try {
    const doc = await withStore('readonly', store => request(store.get(id) as IDBRequest<SavedScan | undefined>));
    return doc ?? null;
  } catch {
    return null;
  }
}

/** Save a finished scan. Resolves to the stored record, or null if storage is unavailable. */
export async function addScan(scan: NewScan): Promise<SavedScan | null> {
  const doc: SavedScan = {
    ...scan,
    id: scan.id ?? newId(),
    createdAt: scan.createdAt ?? Date.now(),
    size: scan.size ?? scan.pdf.size,
  };
  try {
    await withStore('readwrite', async store => {
      await request(store.put(doc));
      // Keep the library bounded: drop the oldest beyond the limit.
      const all = await request(store.getAll() as IDBRequest<SavedScan[]>);
      if (all.length > MAX_DOCS) {
        all.sort((a, b) => b.createdAt - a.createdAt);
        for (const old of all.slice(MAX_DOCS)) await request(store.delete(old.id));
      }
    });
    notify();
    return doc;
  } catch {
    return null;
  }
}

export async function renameScan(id: string, name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) return;
  try {
    await withStore('readwrite', async store => {
      const doc = await request(store.get(id) as IDBRequest<SavedScan | undefined>);
      if (doc) await request(store.put({ ...doc, name: trimmed }));
    });
    notify();
  } catch {
    /* storage unavailable */
  }
}

export async function deleteScan(id: string): Promise<void> {
  try {
    await withStore('readwrite', store => request(store.delete(id)).then(() => undefined));
    notify();
  } catch {
    /* storage unavailable */
  }
}

/** Call `listener` whenever the library changes. Returns an unsubscribe function. */
export function subscribeScans(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(SCAN_LIBRARY_EVENT, listener);
  return () => window.removeEventListener(SCAN_LIBRARY_EVENT, listener);
}
