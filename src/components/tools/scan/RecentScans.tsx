'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, FileDown, FileText, Lock, Pencil, Search, Share2, Trash2, X } from 'lucide-react';
import { downloadBlob } from '@/lib/pdf-engine';
import { deleteScan, listScans, renameScan, subscribeScans, type SavedScan } from '@/lib/scan-library';

interface Item {
  doc: SavedScan;
  thumbUrl: string | null;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(2)} MB`;
}

function pdfName(name: string): string {
  const base = name.trim().replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').slice(0, 120) || 'Scan';
  return base.toLowerCase().endsWith('.pdf') ? base : `${base}.pdf`;
}

function formatDate(ms: number): string {
  try {
    return new Date(ms).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return new Date(ms).toISOString().slice(0, 16).replace('T', ' ');
  }
}

export default function RecentScans({ dark }: { dark?: boolean }) {
  const [items, setItems] = useState<Item[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const urlsRef = useRef<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    const apply = (docs: SavedScan[]) => {
      if (cancelled) return;
      const next = docs.map(doc => ({ doc, thumbUrl: doc.thumb ? URL.createObjectURL(doc.thumb) : null }));
      const old = urlsRef.current;
      urlsRef.current = next.flatMap(i => (i.thumbUrl ? [i.thumbUrl] : []));
      setItems(next);
      old.forEach(u => URL.revokeObjectURL(u));
    };
    listScans().then(apply);
    const unsubscribe = subscribeScans(() => { listScans().then(apply); });
    return () => {
      cancelled = true;
      unsubscribe();
      urlsRef.current.forEach(u => URL.revokeObjectURL(u));
      urlsRef.current = [];
    };
  }, []);

  if (items.length === 0) return null;

  const t = dark
    ? { title: 'text-white', muted: 'text-white/60', card: 'bg-white/5 border-white/10', btn: 'border-white/15 text-white/80 hover:text-white hover:bg-white/10', input: 'bg-white/10 border-white/15 text-white', thumb: 'bg-white/10', badge: 'bg-white/10 text-white/80' }
    : { title: 'text-foreground', muted: 'text-muted-foreground', card: 'bg-gray-50 border-border', btn: 'border-border text-muted-foreground hover:text-foreground hover:bg-white', input: 'bg-white border-border text-foreground', thumb: 'bg-white', badge: 'bg-white border border-border text-muted-foreground' };
  const iconBtn = `w-11 h-11 shrink-0 rounded-lg border flex items-center justify-center transition-colors ${t.btn}`;

  const share = async (doc: SavedScan) => {
    const file = new File([doc.pdf], pdfName(doc.name), { type: 'application/pdf' });
    try {
      await navigator.share({ files: [file], title: doc.name });
    } catch {
      /* the user closed the share sheet */
    }
  };

  const canShare = (doc: SavedScan) => {
    if (typeof navigator === 'undefined' || !navigator.canShare) return false;
    try {
      return navigator.canShare({ files: [new File([doc.pdf], pdfName(doc.name), { type: 'application/pdf' })] });
    } catch {
      return false;
    }
  };

  const startRename = (doc: SavedScan) => {
    setConfirmId(null);
    setEditingId(doc.id);
    setDraft(doc.name);
  };

  const commitRename = async (id: string) => {
    const name = draft.trim();
    setEditingId(null);
    if (name) await renameScan(id, name);
  };

  const remove = async (id: string) => {
    setConfirmId(null);
    await deleteScan(id);
  };

  return (
    <section aria-labelledby="recent-scans-title" className="space-y-3">
      <div>
        <h2 id="recent-scans-title" className={`text-base font-semibold ${t.title}`}>Recent scans</h2>
        <p className={`text-xs mt-0.5 ${t.muted}`}>Saved on this device only. Nothing is uploaded; clearing this site&apos;s data removes them.</p>
      </div>
      <ul className="space-y-2">
        {items.map(({ doc, thumbUrl }) => (
          <li key={doc.id} className={`rounded-xl border p-3 ${t.card}`}>
            <div className="flex gap-3">
              <div className={`w-14 h-[4.5rem] shrink-0 rounded-md overflow-hidden flex items-center justify-center ${t.thumb}`}>
                {thumbUrl
                  // eslint-disable-next-line @next/next/no-img-element -- local object URL
                  ? <img src={thumbUrl} alt="" className="w-full h-full object-cover" />
                  : <FileText className={`w-6 h-6 ${t.muted}`} />}
              </div>
              <div className="min-w-0 flex-1">
                {editingId === doc.id ? (
                  <form
                    onSubmit={e => { e.preventDefault(); void commitRename(doc.id); }}
                    className="flex items-center gap-2"
                  >
                    <input
                      autoFocus
                      value={draft}
                      onChange={e => setDraft(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Escape') setEditingId(null); }}
                      aria-label="New name"
                      className={`min-w-0 flex-1 rounded-lg border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-500/40 ${t.input}`}
                    />
                    <button type="submit" aria-label="Save name" disabled={!draft.trim()} className={`${iconBtn} disabled:opacity-50`}><Check className="w-4 h-4" /></button>
                    <button type="button" aria-label="Cancel rename" onClick={() => setEditingId(null)} className={iconBtn}><X className="w-4 h-4" /></button>
                  </form>
                ) : (
                  <p className={`text-sm font-semibold break-words ${t.title}`}>{doc.name}</p>
                )}
                <p className={`text-xs mt-1 ${t.muted}`}>
                  {formatDate(doc.createdAt)} · {doc.pages} page{doc.pages === 1 ? '' : 's'} · {formatBytes(doc.size)}
                </p>
                {(doc.protected || doc.searchable) && (
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {doc.protected && <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${t.badge}`}><Lock className="w-3 h-3" /> Password</span>}
                    {doc.searchable && <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${t.badge}`}><Search className="w-3 h-3" /> Searchable</span>}
                  </div>
                )}
              </div>
            </div>

            {confirmId === doc.id ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className={`text-sm ${t.title}`}>Delete this scan from this device?</span>
                <div className="flex gap-2 ml-auto">
                  <button onClick={() => void remove(doc.id)} className="min-h-11 px-4 rounded-lg text-sm font-semibold text-white bg-red-600 active:scale-[0.98]">Delete</button>
                  <button onClick={() => setConfirmId(null)} className={`min-h-11 px-4 rounded-lg text-sm font-medium border ${t.btn}`}>Cancel</button>
                </div>
              </div>
            ) : (
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => downloadBlob(doc.pdf, pdfName(doc.name))}
                  className="flex-1 min-h-11 px-4 rounded-lg font-semibold text-sm text-white bg-violet-600 flex items-center justify-center gap-2 active:scale-[0.98]"
                  aria-label={`Download ${doc.name}`}
                >
                  <FileDown className="w-4 h-4" /> Download
                </button>
                {canShare(doc) && (
                  <button onClick={() => void share(doc)} aria-label={`Share ${doc.name}`} title="Share" className={iconBtn}><Share2 className="w-4 h-4" /></button>
                )}
                <button onClick={() => startRename(doc)} aria-label={`Rename ${doc.name}`} title="Rename" className={iconBtn}><Pencil className="w-4 h-4" /></button>
                <button onClick={() => { setEditingId(null); setConfirmId(doc.id); }} aria-label={`Delete ${doc.name}`} title="Delete" className={iconBtn}><Trash2 className="w-4 h-4" /></button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
