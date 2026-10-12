'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { ArrowLeft, Loader2, AlertCircle, CheckCircle2, Scissors, AlertTriangle, ChevronLeft, ChevronRight, Undo2, Trash2, MousePointerSquareDashed } from 'lucide-react';
import Link from 'next/link';
import FileUpload from '@/components/FileUpload';
import { renderPdfPreviews, redactPdf, downloadBlob, getOutputFilename, type PagePreview } from '@/lib/pdf-engine';
import { friendlyError } from '@/lib/errors';
import { useT } from '@/i18n/I18nProvider';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(2)} MB`;
}

/** A drawn box, stored in PDF points with a bottom-left origin (what redactPdf expects). */
interface Box { pageIndex: number; x: number; y: number; width: number; height: number }

type Mode = 'areas' | 'pages';

const MIN_BOX_PX = 4;

export default function RedactPdfTool() {
  const t = useT();
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<PagePreview[]>([]);
  const [loadingPreviews, setLoadingPreviews] = useState(false);
  const [previewProgress, setPreviewProgress] = useState('');
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('areas');
  const [current, setCurrent] = useState(0);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [drag, setDrag] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ size: number; summary: string } | null>(null);
  const surface = useRef<HTMLDivElement>(null);

  const page = previews[current];
  const pageBoxes = boxes.filter(b => b.pageIndex === current);
  const markedPages = new Set(boxes.map(b => b.pageIndex)).size;

  const reset = () => {
    setFiles([]); setPreviews([]); setBoxes([]); setSelectedPages(new Set());
    setCurrent(0); setResult(null); setError(null);
  };

  useEffect(() => {
    if (files.length === 0) return; // reset() clears previews when the file is removed
    let cancelled = false;
    (async () => {
      setLoadingPreviews(true);
      setPreviewError(null);
      setBoxes([]);
      setSelectedPages(new Set());
      setCurrent(0);
      try {
        const rendered = await renderPdfPreviews(files[0], { scale: 1.5 }, (p, total) => {
          if (!cancelled) setPreviewProgress(t('Rendering page {page} of {total}…', { page: p, total }));
        });
        if (!cancelled) setPreviews(rendered);
      } catch {
        if (!cancelled) setPreviewError(t('Could not render the pages. The file may be corrupted or password-protected.'));
      } finally {
        if (!cancelled) { setLoadingPreviews(false); setPreviewProgress(''); }
      }
    })();
    return () => { cancelled = true; };
  }, [files, t]);

  const relative = (e: React.PointerEvent) => {
    const rect = surface.current!.getBoundingClientRect();
    return {
      x: Math.min(Math.max(e.clientX - rect.left, 0), rect.width),
      y: Math.min(Math.max(e.clientY - rect.top, 0), rect.height),
    };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!page || processing) return;
    e.preventDefault();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const p = relative(e);
    setDrag({ x0: p.x, y0: p.y, x1: p.x, y1: p.y });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag) return;
    const p = relative(e);
    setDrag(d => (d ? { ...d, x1: p.x, y1: p.y } : d));
  };

  const onPointerUp = () => {
    if (!drag || !page || !surface.current) { setDrag(null); return; }
    const rect = surface.current.getBoundingClientRect();
    const left = Math.min(drag.x0, drag.x1);
    const top = Math.min(drag.y0, drag.y1);
    const width = Math.abs(drag.x1 - drag.x0);
    const height = Math.abs(drag.y1 - drag.y0);
    setDrag(null);
    if (width < MIN_BOX_PX || height < MIN_BOX_PX) return; // a stray click, not a box

    // Screen pixels to PDF points; the PDF's origin is the bottom-left corner.
    const sx = page.pointWidth / rect.width;
    const sy = page.pointHeight / rect.height;
    setBoxes(prev => [...prev, {
      pageIndex: current,
      x: left * sx,
      y: page.pointHeight - (top + height) * sy,
      width: width * sx,
      height: height * sy,
    }]);
  };

  const undo = useCallback(() => {
    setBoxes(prev => {
      const fromEnd = [...prev].reverse().findIndex(b => b.pageIndex === current);
      if (fromEnd === -1) return prev;
      const index = prev.length - 1 - fromEnd;
      return prev.filter((_, i) => i !== index);
    });
  }, [current]);

  useEffect(() => {
    if (mode !== 'areas') return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, mode]);

  const togglePage = (pageIndex: number) => {
    setSelectedPages(prev => {
      const next = new Set(prev);
      if (next.has(pageIndex)) next.delete(pageIndex); else next.add(pageIndex);
      return next;
    });
  };

  const ready = mode === 'areas' ? boxes.length > 0 : selectedPages.size > 0;

  const handleRedact = useCallback(async () => {
    if (files.length === 0 || !ready) return;
    setProcessing(true);
    setError(null);
    try {
      const redactions = mode === 'areas'
        ? boxes
        : [...selectedPages].map(i => ({ pageIndex: i, x: 0, y: 0, width: previews[i].pointWidth, height: previews[i].pointHeight }));
      const blob = await redactPdf(files[0], redactions);
      downloadBlob(blob, getOutputFilename('redact-pdf', '-redacted.pdf'));
      const summary = mode === 'areas'
        ? (boxes.length !== 1
          ? (markedPages !== 1
            ? t('{areas} areas removed on {pages} pages', { areas: boxes.length, pages: markedPages })
            : t('{areas} areas removed on {pages} page', { areas: boxes.length, pages: markedPages }))
          : (markedPages !== 1
            ? t('{areas} area removed on {pages} pages', { areas: boxes.length, pages: markedPages })
            : t('{areas} area removed on {pages} page', { areas: boxes.length, pages: markedPages })))
        : (selectedPages.size !== 1
          ? t('{count} pages blacked out', { count: selectedPages.size })
          : t('{count} page blacked out', { count: selectedPages.size }));
      setResult({ size: blob.size, summary });
    } catch (err: unknown) {
      setError(friendlyError(err));
    } finally {
      setProcessing(false);
    }
  }, [files, ready, mode, boxes, selectedPages, previews, markedPages, t]);

  const modeButton = (m: Mode, label: string) => (
    <button
      onClick={() => setMode(m)}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${mode === m ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-6">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-3">
          <ArrowLeft className="w-4 h-4" /> {t('Back to all tools')}
        </Link>

        <div className="mb-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-red-50"><Scissors className="w-6 h-6 text-red-500" /></div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t('Redact PDF')}</h1>
              <p className="text-muted-foreground text-sm sm:text-base">{t('Black out text, images or whole pages permanently — in your browser, nothing uploaded')}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-border p-6 sm:p-8 shadow-sm">
          <FileUpload
            accept=".pdf"
            multiple={false}
            files={files}
            onFilesSelected={(f) => { setFiles(f); setResult(null); setError(null); }}
            onRemoveFile={reset}
          />

          {files.length > 0 && !result && (
            <div className="mt-6 space-y-5">
              <div className="p-3 bg-red-50/60 border border-red-200 rounded-xl flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <p className="text-xs text-red-800 leading-relaxed">
                  {t('This is true redaction, not a black box drawn on top: every page you mark is rebuilt as an image with the boxes burned in, so the hidden text cannot be selected, copied or recovered. The rest of a marked page also becomes an image (not selectable text); unmarked pages are left untouched. Only redact documents you own or have permission to modify.')}
                </p>
              </div>

              <div className="inline-flex p-1 bg-gray-100 rounded-xl">
                {modeButton('areas', t('Draw boxes'))}
                {modeButton('pages', t('Whole pages'))}
              </div>

              {loadingPreviews && (
                <div className="flex items-center justify-center py-12 gap-3 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin" /> {previewProgress || t('Rendering pages…')}
                </div>
              )}

              {previewError && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                  <p className="text-sm text-amber-800">{previewError}</p>
                </div>
              )}

              {!loadingPreviews && !previewError && page && mode === 'areas' && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrent(c => Math.max(0, c - 1))}
                        disabled={current === 0}
                        className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-gray-50 disabled:opacity-40 transition-colors"
                        aria-label={t('Previous page')}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-sm text-muted-foreground tabular-nums">
                        {t('Page {page} of {total}', { page: current + 1, total: previews.length })}
                        {pageBoxes.length > 0 && ` · ${t('{count} marked', { count: pageBoxes.length })}`}
                      </span>
                      <button
                        onClick={() => setCurrent(c => Math.min(previews.length - 1, c + 1))}
                        disabled={current >= previews.length - 1}
                        className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-gray-50 disabled:opacity-40 transition-colors"
                        aria-label={t('Next page')}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                    {boxes.length > 0 && (
                      <div className="flex items-center gap-2">
                        <button onClick={undo} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border hover:bg-gray-50 transition-colors">
                          <Undo2 className="w-3.5 h-3.5" /> {t('Undo box')}
                        </button>
                        <button onClick={() => setBoxes([])} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border hover:bg-gray-50 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" /> {t('Clear all')}
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="bg-gray-100 rounded-xl p-3 sm:p-6 flex justify-center overflow-auto">
                    <div
                      ref={surface}
                      onPointerDown={onPointerDown}
                      onPointerMove={onPointerMove}
                      onPointerUp={onPointerUp}
                      className="relative inline-block shadow-lg cursor-crosshair select-none touch-none max-w-full"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={page.url} alt={t('Page {page}', { page: current + 1 })} draggable={false} className="block max-w-full h-auto" />

                      {pageBoxes.map((box, i) => (
                        <div
                          key={i}
                          className="absolute bg-black/85 border border-black"
                          style={{
                            left: `${(box.x / page.pointWidth) * 100}%`,
                            top: `${((page.pointHeight - box.y - box.height) / page.pointHeight) * 100}%`,
                            width: `${(box.width / page.pointWidth) * 100}%`,
                            height: `${(box.height / page.pointHeight) * 100}%`,
                          }}
                        />
                      ))}

                      {drag && (
                        <div
                          className="absolute bg-black/40 border-2 border-dashed border-black pointer-events-none"
                          style={{
                            left: Math.min(drag.x0, drag.x1),
                            top: Math.min(drag.y0, drag.y1),
                            width: Math.abs(drag.x1 - drag.x0),
                            height: Math.abs(drag.y1 - drag.y0),
                          }}
                        />
                      )}
                    </div>
                  </div>

                  <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground text-center">
                    <MousePointerSquareDashed className="w-3.5 h-3.5 shrink-0" />
                    {t('Drag across a name, number, signature or image to mark it. Use the arrows to mark other pages.')}
                  </p>
                </div>
              )}

              {!loadingPreviews && !previewError && previews.length > 0 && mode === 'pages' && (
                <div>
                  <p className="text-sm font-semibold text-foreground mb-4">{t('Click pages to black out completely ({count} selected)', { count: selectedPages.size })}</p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                    {previews.map((p, i) => (
                      <button key={p.page} onClick={() => togglePage(i)}
                        className={`relative rounded-xl overflow-hidden border-2 transition-all group ${selectedPages.has(i) ? 'border-red-500 ring-2 ring-red-500/20 bg-red-50/30' : 'border-border hover:border-gray-300'}`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.url} alt={t('Page {page}', { page: p.page })} className="w-full h-auto block" />
                        <div className={`absolute inset-0 transition-colors ${selectedPages.has(i) ? 'bg-red-500/20' : 'group-hover:bg-black/5'}`} />
                        <div className="absolute bottom-0 left-0 right-0 py-1 px-1.5 bg-gradient-to-t from-black/60 to-transparent">
                          <span className="text-[10px] font-medium text-white">{p.page}</span>
                        </div>
                        {selectedPages.has(i) && (
                          <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
                            <Scissors className="w-2.5 h-2.5 text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
                  <p className="text-sm text-destructive">{t(error)}</p>
                </div>
              )}

              <button onClick={handleRedact} disabled={processing || !ready || loadingPreviews}
                className="px-8 py-3.5 rounded-xl font-semibold text-sm transition-all flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white hover:shadow-lg hover:shadow-red-500/25 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed">
                {processing
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> {t('Redacting…')}</>
                  : <><Scissors className="w-4 h-4" /> {mode === 'areas'
                      ? (boxes.length !== 1 ? t('Redact {count} areas', { count: boxes.length }) : t('Redact {count} area', { count: boxes.length }))
                      : (selectedPages.size !== 1 ? t('Redact {count} pages', { count: selectedPages.size }) : t('Redact {count} page', { count: selectedPages.size }))}</>}
              </button>
            </div>
          )}

          {result && (
            <div className="mt-6 space-y-4 animate-fade-in">
              <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                <p className="text-sm text-green-800"><span className="font-semibold">{t('PDF redacted')}</span> — {result.summary} ({formatBytes(result.size)}).</p>
              </div>
              <button onClick={reset}
                className="px-5 py-2.5 rounded-xl text-sm font-medium border border-border hover:bg-gray-50 transition-colors">
                {t('Redact Another')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
