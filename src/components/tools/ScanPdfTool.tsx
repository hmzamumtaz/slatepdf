'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import {
  AlertCircle, ArrowLeft, BookOpen, Camera, CheckCircle2, Contact, Crop, Eraser, FileSearch, IdCard,
  ImagePlus, Link2, Loader2, Lock, Palette, PenLine, Presentation, Smartphone, Trash2,
} from 'lucide-react';
import { detectDocumentCornersInImage, refineCorners, type ScanFilter } from '@/lib/document-scanner';
import {
  blobToCanvas, canvasToJpeg, clearSession, DEFAULT_EDITS, defaultDocName, FULL_QUAD, loadSession,
  renderPage, saveSession, type ScanPage,
} from '@/lib/scan-session';
import CameraScreen, { openCameraStream, type CapturedPage } from './scan/CameraScreen';
import ReviewScreen from './scan/ReviewScreen';
import ExportPanel from './scan/ExportPanel';
import RecentScans from './scan/RecentScans';
import ScanErrorBoundary from './scan/ScanErrorBoundary';
import { terminateOcr } from '@/lib/scan-ocr';

type View = 'home' | 'camera' | 'review';

const noopSubscribe = () => () => undefined;

function detectMobile(): boolean {
  const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  return /Mobi|Android|iPhone|iPad|iPod|Silk/i.test(navigator.userAgent) || (coarse && navigator.maxTouchPoints > 0);
}
type Edit = Partial<Pick<ScanPage, 'parts' | 'rotation' | 'filter' | 'brightness' | 'contrast' | 'strokes' | 'marks'>>;

const HISTORY_LIMIT = 30;

const FEATURES = [
  { icon: FileSearch, title: 'Auto page detection', text: 'Finds the page edges and captures it when you hold steady.' },
  { icon: Crop, title: 'Crop & straighten', text: 'Drag the corners; skewed photos come out flat and square.' },
  { icon: Palette, title: 'Scan filters', text: 'Auto color, Grayscale, B&W and Whiteboard remove shadows.' },
  { icon: BookOpen, title: 'Book mode', text: 'Splits an open book into two separate pages.' },
  { icon: IdCard, title: 'ID card mode', text: 'Front and back of a card on one page, at real size.' },
  { icon: Contact, title: 'Business cards', text: 'Reads the card and saves it as a contact.' },
  { icon: Presentation, title: 'Whiteboard mode', text: 'Whitens glare and boosts marker colours.' },
  { icon: PenLine, title: 'Markup & sign', text: 'Draw, highlight, add text and your signature.' },
  { icon: Eraser, title: 'Cleanup', text: 'Brush away stains, marks and fingers.' },
  { icon: CheckCircle2, title: 'Searchable PDF', text: 'Text recognition (OCR) so you can search and copy.' },
  { icon: Lock, title: 'Password & JPG', text: 'Lock the PDF with a password, or save pages as JPG.' },
];

function Scanner() {
  const [pages, setPages] = useState<ScanPage[]>([]);
  const [docName, setDocName] = useState('');
  const [view, setView] = useState<View>('home');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [opening, setOpening] = useState(false);
  const [retakeId, setRetakeId] = useState<number | null>(null);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [cropFirst, setCropFirst] = useState(false);
  const [importing, setImporting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [canUndo, setCanUndo] = useState(false);

  const pagesRef = useRef<ScanPage[]>([]);
  const nextId = useRef(1);
  const urls = useRef(new Map<number, string>());
  const versions = useRef(new Map<number, number>());
  const queue = useRef<Promise<void>>(Promise.resolve());
  const restored = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const history = useRef<ScanPage[][]>([]);

  // Server HTML assumes desktop; the device check runs after hydration
  // (useSyncExternalStore avoids a hydration mismatch).
  const isMobile = useSyncExternalStore(noopSubscribe, detectMobile, () => false);

  const commit = useCallback((next: ScanPage[]) => {
    pagesRef.current = next;
    setPages(next);
  }, []);

  /** Remember the pages before a user edit so it can be undone. */
  const remember = useCallback(() => {
    history.current.push(pagesRef.current);
    if (history.current.length > HISTORY_LIMIT) history.current.shift();
    setCanUndo(true);
  }, []);

  /* ---------------------------- rendering ---------------------------- */

  /** Re-render a page from its original photo. Renders run one at a time; a newer edit wins. */
  const schedule = useCallback((page: ScanPage) => {
    const v = (versions.current.get(page.id) ?? 0) + 1;
    versions.current.set(page.id, v);
    queue.current = queue.current.then(async () => {
      if (versions.current.get(page.id) !== v) return;
      try {
        const out = await renderPage(page);
        if (versions.current.get(page.id) !== v || !pagesRef.current.some(p => p.id === page.id)) return;
        const url = URL.createObjectURL(out);
        const old = urls.current.get(page.id);
        if (old) URL.revokeObjectURL(old);
        urls.current.set(page.id, url);
        commit(pagesRef.current.map(p => (p.id === page.id ? { ...p, out, url } : p)));
      } catch {
        setError('A page could not be processed. Try cropping it again or retake it.');
      }
    });
  }, [commit]);

  const newPage = useCallback((c: Omit<ScanPage, 'id' | 'out' | 'url' | keyof typeof DEFAULT_EDITS> & { filter: ScanFilter }): ScanPage => ({
    ...DEFAULT_EDITS,
    strokes: [],
    marks: [],
    ...c,
    id: nextId.current++,
    out: null,
    url: null,
  }), []);

  /* --------------------------- persistence --------------------------- */

  useEffect(() => {
    let cancelled = false;
    void loadSession().then(saved => {
      if (cancelled) return;
      restored.current = true;
      if (!saved || saved.pages.length === 0) {
        setDocName(defaultDocName());
        return;
      }
      // Sessions saved before markup existed have no `marks`.
      const list = saved.pages.map(p => ({ ...p, marks: p.marks ?? [], id: nextId.current++, out: null, url: null }));
      commit(list);
      setDocName(saved.docName || defaultDocName());
      setNotice(`Restored ${list.length} scanned page${list.length === 1 ? '' : 's'} from your last session.`);
      list.forEach(schedule);
    });
    return () => { cancelled = true; };
  }, [commit, schedule]);

  useEffect(() => {
    if (!restored.current) return;
    const t = window.setTimeout(() => {
      void saveSession({ docName, pages: pages.map(({ id, parts, layout, rotation, filter, brightness, contrast, strokes, marks }) => ({ id, parts, layout, rotation, filter, brightness, contrast, strokes, marks, out: null })) });
    }, 700);
    return () => window.clearTimeout(t);
  }, [pages, docName]);

  useEffect(() => {
    const map = urls.current;
    return () => {
      map.forEach(u => URL.revokeObjectURL(u));
      void terminateOcr();
    };
  }, []);

  /* ----------------------------- adding ------------------------------ */

  const openCamera = useCallback(async (retake: number | null = null) => {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('This browser cannot use the camera. Add photos instead.');
      return;
    }
    setOpening(true);
    let s: MediaStream | null = null;
    try {
      s = await openCameraStream('environment');
    } catch {
      s = null;
    }
    setOpening(false);
    setStream(s);
    setRetakeId(retake);
    setView('camera');
  }, []);

  const closeCamera = useCallback((to: View) => {
    stream?.getTracks().forEach(t => t.stop());
    setStream(null);
    setRetakeId(null);
    setView(to);
  }, [stream]);

  const handleCapture = useCallback((captured: CapturedPage[]) => {
    const made = captured.map(c => newPage({ parts: c.parts, layout: c.layout, filter: c.filter }));
    remember();
    if (retakeId !== null) {
      const idx = pagesRef.current.findIndex(p => p.id === retakeId);
      const replacement = made[0];
      const next = pagesRef.current.slice();
      if (idx >= 0) next.splice(idx, 1, replacement); else next.push(replacement);
      commit(next);
      schedule(replacement);
      setReviewIndex(Math.max(0, idx));
      setCropFirst(captured[0].needsCrop);
      closeCamera('review');
      return;
    }
    const next = [...pagesRef.current, ...made];
    commit(next);
    made.forEach(schedule);
    if (captured.some(c => c.needsCrop)) {
      // No page edges were found: check the borders now, like a manual shot.
      setReviewIndex(next.length - made.length);
      setCropFirst(true);
      closeCamera('review');
    }
  }, [retakeId, newPage, commit, schedule, closeCamera, remember]);

  const importFiles = useCallback(async (files: FileList | File[]) => {
    const list = Array.from(files).filter(f => f.type.startsWith('image/') || /\.(heic|heif)$/i.test(f.name));
    if (list.length === 0) { setError('Only image files can be added as pages.'); return; }
    setError(null);
    setImporting(true);
    const made: ScanPage[] = [];
    for (const file of list) {
      try {
        const canvas = await blobToCanvas(file, 3200);
        const found = detectDocumentCornersInImage(canvas);
        const quad = found ? refineCorners(canvas, found) : FULL_QUAD;
        const source = await canvasToJpeg(canvas, 0.92);
        made.push(newPage({ parts: [{ source, quad, autoQuad: found ? quad : undefined }], layout: 'single', filter: 'enhance' }));
      } catch {
        setError(`"${file.name}" could not be read as an image.`);
      }
    }
    setImporting(false);
    if (made.length === 0) return;
    remember();
    if (retakeId !== null) {
      const idx = pagesRef.current.findIndex(p => p.id === retakeId);
      const next = pagesRef.current.slice();
      if (idx >= 0) next.splice(idx, 1, made[0]); else next.push(made[0]);
      commit(next);
      schedule(made[0]);
      setReviewIndex(Math.max(0, idx));
      closeCamera('review');
      return;
    }
    const start = pagesRef.current.length;
    commit([...pagesRef.current, ...made]);
    made.forEach(schedule);
    setReviewIndex(start);
    if (view === 'camera') closeCamera('review');
    else if (isMobile) setView('review');
  }, [retakeId, newPage, commit, schedule, closeCamera, view, isMobile, remember]);

  /* ----------------------------- editing ----------------------------- */

  const updatePage = useCallback((id: number, edit: Edit) => {
    remember();
    let changed: ScanPage | null = null;
    const next = pagesRef.current.map(p => {
      if (p.id !== id) return p;
      changed = { ...p, ...edit };
      return changed;
    });
    commit(next);
    if (changed) schedule(changed);
  }, [commit, schedule, remember]);

  const revertPage = useCallback((id: number) => {
    const page = pagesRef.current.find(p => p.id === id);
    if (!page) return;
    updatePage(id, {
      parts: page.parts.map(part => ({ ...part, quad: part.autoQuad ?? FULL_QUAD })),
      rotation: 0, brightness: 0, contrast: 0, strokes: [], marks: [],
    });
  }, [updatePage]);

  const undo = useCallback(() => {
    const prev = history.current.pop();
    setCanUndo(history.current.length > 0);
    if (!prev) return;
    const current = new Map(pagesRef.current.map(p => [p.id, p]));
    const changed: ScanPage[] = [];
    const next = prev.map(p => {
      if (current.get(p.id) === p) return p;
      // A changed (or deleted) page gets re-rendered; keep its live preview meanwhile.
      const restoredPage = { ...p, url: urls.current.get(p.id) ?? null };
      changed.push(restoredPage);
      return restoredPage;
    });
    commit(next);
    changed.forEach(schedule);
    setReviewIndex(i => Math.min(i, Math.max(0, next.length - 1)));
    if (next.length > 0 && view === 'home' && isMobile) setView('review');
  }, [commit, schedule, view, isMobile]);

  const filterAll = useCallback((filter: ScanFilter) => {
    remember();
    const changed: ScanPage[] = [];
    const next = pagesRef.current.map(p => {
      if (p.filter === filter) return p;
      const updated = { ...p, filter };
      changed.push(updated);
      return updated;
    });
    commit(next);
    changed.forEach(schedule);
  }, [commit, schedule, remember]);

  const deletePage = useCallback((id: number) => {
    remember();
    const idx = pagesRef.current.findIndex(p => p.id === id);
    // Keep the preview URL: undo may bring the page back.
    versions.current.delete(id);
    const next = pagesRef.current.filter(p => p.id !== id);
    commit(next);
    setReviewIndex(Math.max(0, Math.min(idx, next.length - 1)));
    if (next.length === 0) setView('home');
  }, [commit, remember]);

  const movePage = useCallback((from: number, to: number) => {
    const next = pagesRef.current.slice();
    if (to < 0 || to >= next.length || from === to) return;
    remember();
    const [p] = next.splice(from, 1);
    next.splice(to, 0, p);
    commit(next);
    setReviewIndex(to);
  }, [commit, remember]);

  const startOver = useCallback(() => {
    urls.current.forEach(u => URL.revokeObjectURL(u));
    urls.current.clear();
    versions.current.clear();
    history.current = [];
    setCanUndo(false);
    commit([]);
    setDocName(defaultDocName());
    setNotice(null);
    setView('home');
    void clearSession();
  }, [commit]);

  const copyLink = useCallback(async () => {
    const url = 'https://slatepdf.space/tools/scan-pdf';
    try { await navigator.clipboard.writeText(url); } catch { window.prompt('Copy this link:', url); }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }, []);

  const lastThumb = pages.length ? pages[pages.length - 1].url : null;

  /* ------------------------------ render ----------------------------- */

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-6">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-3">
          <ArrowLeft className="w-4 h-4" /> Back to all tools
        </Link>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center"><Camera className="w-6 h-6 text-violet-600" /></div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Scan PDF</h1>
            <p className="text-muted-foreground text-sm sm:text-base">Scan documents with your phone camera and save them as a PDF</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-border p-4 sm:p-6 shadow-sm">
          {isMobile ? (
            <div className="rounded-2xl bg-gradient-to-br from-violet-600 to-violet-800 text-white p-6 text-center">
              <Camera className="w-10 h-10 mx-auto mb-3" />
              <p className="text-lg font-bold">{pages.length ? 'Keep scanning' : 'Scan documents to PDF'}</p>
              <p className="text-sm text-violet-200 mt-1">Auto-detects the page, straightens it and cleans it up — on your phone, with nothing uploaded.</p>
              <div className="flex flex-col gap-2.5 mt-5">
                <button onClick={() => openCamera()} disabled={opening} className="w-full py-3.5 rounded-xl bg-white text-violet-700 font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-70">
                  {opening ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />} {opening ? 'Starting camera…' : 'Open camera'}
                </button>
                <button onClick={() => fileRef.current?.click()} disabled={importing} className="w-full py-3.5 rounded-xl bg-white/15 font-semibold text-sm flex items-center justify-center gap-2">
                  {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />} Import from photos
                </button>
                {pages.length > 0 && (
                  <button onClick={() => { setReviewIndex(0); setView('review'); }} className="w-full py-3 rounded-xl border border-white/30 font-semibold text-sm">
                    Review {pages.length} page{pages.length === 1 ? '' : 's'}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-gradient-to-br from-violet-600 to-violet-800 text-white p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                <div className="w-16 h-16 rounded-2xl bg-white/15 flex items-center justify-center shrink-0"><Smartphone className="w-9 h-9" /></div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl sm:text-2xl font-bold">Best on your phone</h2>
                  <p className="text-sm text-violet-200 mt-1.5 leading-relaxed">
                    Open this page on your phone to scan with its camera. On this computer you can import photos — they get the same page detection, crop, filters and OCR — or use a webcam.
                  </p>
                  <div className="flex flex-col sm:flex-row flex-wrap gap-2 mt-4">
                    <button onClick={() => fileRef.current?.click()} disabled={importing} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white text-violet-700 text-sm font-semibold">
                      {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />} Import photos
                    </button>
                    <button onClick={copyLink} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/15 text-sm font-medium">
                      {copied ? <CheckCircle2 className="w-4 h-4" /> : <Link2 className="w-4 h-4" />} {copied ? 'Link copied!' : 'Copy link for your phone'}
                    </button>
                    <button onClick={() => openCamera()} disabled={opening} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/15 text-sm font-medium">
                      {opening ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />} Use webcam
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={e => { if (e.target.files?.length) void importFiles(e.target.files); e.target.value = ''; }} />

          {notice && (
            <div className="mt-4 p-3 bg-violet-50 border border-violet-200 rounded-xl flex items-center justify-between gap-3">
              <p className="text-xs text-violet-900">{notice}</p>
              <button onClick={() => setNotice(null)} className="text-xs font-semibold text-violet-700">OK</button>
            </div>
          )}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
              <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
              <p className="text-xs text-destructive">{error}</p>
            </div>
          )}

          {pages.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground">{pages.length} page{pages.length === 1 ? '' : 's'} · tap a page to edit</h3>
                <button onClick={startOver} className="px-3 py-1.5 rounded-lg text-xs font-medium text-destructive border border-red-200 hover:bg-red-50 flex items-center gap-1.5">
                  <Trash2 className="w-3.5 h-3.5" /> Start over
                </button>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-3">
                {pages.map((p, i) => (
                  <button key={p.id} onClick={() => { setReviewIndex(i); setView('review'); }} className="relative aspect-[3/4] rounded-xl overflow-hidden bg-gray-100 border border-border hover:ring-2 hover:ring-violet-400" title={`Edit page ${i + 1}`}>
                    {p.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.url} alt={`Page ${i + 1}`} className="absolute inset-0 w-full h-full object-cover" />
                    ) : <Loader2 className="absolute inset-0 m-auto w-5 h-5 animate-spin text-muted-foreground" />}
                    <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-medium">{i + 1}</span>
                  </button>
                ))}
              </div>
              <div className="mt-6 pt-6 border-t border-border">
                <ExportPanel pages={pages} docName={docName} onDocName={setDocName} onScanNew={startOver} />
              </div>
            </div>
          )}

          <div className="mt-6 empty:hidden"><RecentScans /></div>

          {pages.length === 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
              {FEATURES.map(f => (
                <div key={f.title} className="rounded-xl bg-gray-50 p-3">
                  <f.icon className="w-5 h-5 text-violet-600 mb-1.5" />
                  <p className="text-xs font-semibold text-foreground">{f.title}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{f.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {opening && (
        <div className="fixed inset-0 z-[80] flex flex-col items-center justify-center gap-3 bg-black text-white" role="status">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="text-sm">Starting camera…</p>
          <p className="text-xs text-white/60 px-8 text-center">If your browser asks, allow camera access.</p>
        </div>
      )}

      {view === 'camera' && (
        <CameraScreen
          initialStream={stream}
          pageCount={pages.length}
          lastThumb={lastThumb}
          retake={retakeId !== null}
          onCapture={handleCapture}
          onImport={files => void importFiles(files)}
          onReview={() => { setReviewIndex(Math.max(0, pages.length - 1)); closeCamera('review'); }}
          onClose={() => closeCamera(pages.length > 0 ? 'review' : 'home')}
        />
      )}

      {view === 'review' && pages.length > 0 && (
        <ReviewScreen
          pages={pages}
          index={Math.min(reviewIndex, pages.length - 1)}
          onIndex={setReviewIndex}
          docName={docName}
          onDocName={setDocName}
          cropFirst={cropFirst}
          onCropFirstHandled={() => setCropFirst(false)}
          onBack={() => setView('home')}
          onAddMore={() => void openCamera()}
          onRetake={id => void openCamera(id)}
          onUpdate={updatePage}
          onDelete={deletePage}
          onMove={movePage}
          onFilterAll={filterAll}
          onRevert={revertPage}
          canUndo={canUndo}
          onUndo={undo}
          onScanNew={startOver}
        />
      )}
    </div>
  );
}

export default function ScanPdfTool() {
  return (
    <ScanErrorBoundary>
      <Scanner />
    </ScanErrorBoundary>
  );
}
