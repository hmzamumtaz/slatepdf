'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Loader2, Check, AlertCircle, Bold, Italic, Type, Trash2, RotateCcw,
  Download, ChevronLeft, ChevronRight, Plus, AlertTriangle, Undo2,
} from 'lucide-react';
import FileUpload from '@/components/FileUpload';
import { downloadBlob, getOutputFilename, getPdfJs } from '@/lib/pdf-engine';
import {
  openEditableDocument, buildEditedPdf, isChanged, toWinAnsi, rgbToHex, hexToRgb,
  type EditorSession, type LoadedPage, type TextBlock, type FontFamily,
} from '@/lib/pdf-editor';

const FAMILIES: { value: FontFamily; label: string; css: string }[] = [
  { value: 'Helvetica', label: 'Sans', css: 'Arial, Helvetica, sans-serif' },
  { value: 'Times', label: 'Serif', css: '"Times New Roman", Times, serif' },
  { value: 'Courier', label: 'Mono', css: '"Courier New", Courier, monospace' },
];

const SWATCHES = ['#000000', '#374151', '#b91c1c', '#c2410c', '#047857', '#1d4ed8', '#6d28d9', '#ffffff'];

const messageOf = (err: unknown, fallback: string) => (err instanceof Error && err.message ? err.message : fallback);

/** Approximate drawn width, for the "wider than the original" warning. */
function measureWidth(block: TextBlock): number {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return 0;
  const css = FAMILIES.find(f => f.value === block.family)?.css ?? 'sans-serif';
  ctx.font = `${block.italic ? 'italic ' : ''}${block.bold ? 'bold ' : ''}${block.fontSize}px ${css}`;
  return ctx.measureText(toWinAnsi(block.text).text).width;
}

export default function EditPdfPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [session, setSession] = useState<EditorSession | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [page, setPage] = useState<LoadedPage | null>(null);
  const [blocks, setBlocks] = useState<TextBlock[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(false);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const previewToken = useRef(0);
  const addedCount = useRef(0);

  const pageBlocks = useMemo(
    () => blocks.filter(b => b.page === pageIndex),
    [blocks, pageIndex],
  );
  const selected = useMemo(
    () => blocks.find(b => b.id === selectedId) ?? null,
    [blocks, selectedId],
  );
  const changes = useMemo(() => blocks.filter(isChanged), [blocks]);

  const reset = useCallback(() => {
    setSession(null); setPage(null); setBlocks([]); setSelectedId(null);
    setPageIndex(0); setPreviewUrl(null); setDone(false); setError(null); setPlacing(false);
    addedCount.current = 0;
  }, []);

  // Open the document and read its first page.
  useEffect(() => {
    if (files.length === 0) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const opened = await openEditableDocument(files[0]);
        if (cancelled) { opened.destroy(); return; }
        setSession(opened);
        const first = await opened.getPage(0);
        if (cancelled) return;
        setPage(first);
        setBlocks(first.blocks);
        setPageIndex(0);
      } catch (err) {
        if (!cancelled) setError(messageOf(err, 'Could not open this PDF for editing.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [files]);

  // Read a page the first time it is visited, keeping any edits already made.
  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const loaded = await session.getPage(pageIndex);
        if (cancelled) return;
        setPage(loaded);
        setBlocks(prev => {
          if (prev.some(b => b.page === pageIndex)) return prev;
          return [...prev, ...loaded.blocks];
        });
      } catch (err) {
        if (!cancelled) setError(messageOf(err, 'Could not read that page.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [session, pageIndex]);

  // The live preview: build the real PDF, render this page, show it.
  useEffect(() => {
    if (!session || files.length === 0 || !page) return;
    const token = ++previewToken.current;
    const timer = setTimeout(async () => {
      setPreviewBusy(true);
      try {
        const bytes = await buildEditedPdf(files[0], blocks);
        if (token !== previewToken.current) return;
        const pdfjsLib = await getPdfJs();
        const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(bytes) }).promise;
        const rendered = await pdf.getPage(pageIndex + 1);
        const base = rendered.getViewport({ scale: 1 });
        const scale = Math.min(2, 1600 / Math.max(base.width, base.height));
        const viewport = rendered.getViewport({ scale });
        const canvas = document.createElement('canvas');
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        await rendered.render({ canvasContext: canvas.getContext('2d')!, viewport, canvas }).promise;
        if (token !== previewToken.current) return;
        setPreviewUrl(canvas.toDataURL('image/jpeg', 0.9));
      } catch (err) {
        if (token === previewToken.current) setError(messageOf(err, 'Could not render the preview.'));
      } finally {
        if (token === previewToken.current) setPreviewBusy(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [session, files, blocks, pageIndex, page]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setSelectedId(null); setPlacing(false); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const update = useCallback((id: string, patch: Partial<TextBlock>) => {
    setBlocks(prev => prev.map(b => (b.id === id ? { ...b, ...patch } : b)));
    setDone(false);
  }, []);

  const placeText = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!placing || !page) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * page.width;
    const yFromTop = ((e.clientY - rect.top) / rect.height) * page.height;
    const block: TextBlock = {
      id: `new-${addedCount.current++}`,
      page: pageIndex,
      text: 'New text',
      original: '',
      x,
      y: page.height - yFromTop,
      width: 0,
      fontSize: 12,
      family: 'Helvetica',
      bold: false,
      italic: false,
      color: { r: 0, g: 0, b: 0 },
      deleted: false,
      added: true,
    };
    setBlocks(prev => [...prev, block]);
    setSelectedId(block.id);
    setPlacing(false);
    setDone(false);
  }, [placing, page, pageIndex]);

  const handleDownload = useCallback(async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setError(null);
    try {
      const bytes = await buildEditedPdf(files[0], blocks);
      downloadBlob(new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' }), getOutputFilename('edit-pdf', '.pdf'));
      setDone(true);
    } catch (err) {
      setError(messageOf(err, 'Could not save the edited PDF.'));
    } finally {
      setProcessing(false);
    }
  }, [files, blocks]);

  const dropped = selected ? toWinAnsi(selected.text).dropped : [];
  const overflowing =
    selected && !selected.added && !selected.deleted && selected.width > 0
      ? measureWidth(selected) > selected.width * 1.06
      : false;

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back to all tools
        </Link>

        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Edit PDF</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Change the words, headings and numbers in a PDF. Everything runs in this tab — your file is never uploaded.
          </p>
        </div>

        {files.length === 0 ? (
          <div className="bg-white rounded-2xl border border-border p-6 sm:p-8 shadow-sm max-w-3xl">
            <FileUpload
              accept=".pdf"
              multiple={false}
              files={files}
              onFilesSelected={(f) => { reset(); setFiles(f); }}
              onRemoveFile={() => { reset(); setFiles([]); }}
            />
            {error && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="grid lg:grid-cols-[380px_1fr] gap-6 items-start">
            {/* Editor */}
            <aside className="bg-white rounded-2xl border border-border shadow-sm flex flex-col max-h-[calc(100vh-9rem)]">
              <div className="p-4 border-b border-border">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <p className="text-sm font-semibold text-foreground truncate" title={files[0].name}>{files[0].name}</p>
                  <button
                    onClick={() => { reset(); setFiles([]); }}
                    className="text-xs text-muted-foreground hover:text-foreground shrink-0 transition-colors"
                  >
                    Change
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setPageIndex(i => Math.max(0, i - 1)); setSelectedId(null); }}
                    disabled={pageIndex === 0 || loading}
                    className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-40 transition-colors"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm text-muted-foreground flex-1 text-center">
                    Page {pageIndex + 1} of {session?.numPages ?? '—'}
                  </span>
                  <button
                    onClick={() => { setPageIndex(i => Math.min((session?.numPages ?? 1) - 1, i + 1)); setSelectedId(null); }}
                    disabled={!session || pageIndex >= session.numPages - 1 || loading}
                    className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-40 transition-colors"
                    aria-label="Next page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <button
                  onClick={() => { setPlacing(p => !p); setSelectedId(null); }}
                  className={`mt-3 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                    placing ? 'bg-black text-white border-black' : 'border-border hover:bg-muted text-foreground'
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  {placing ? 'Click the page to place it' : 'Add text'}
                </button>
              </div>

              {/* Formatting for the selected block */}
              {selected && (
                <div className="p-4 border-b border-border bg-gray-50/70 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {selected.added ? 'Added text' : 'Selected text'}
                  </p>

                  <textarea
                    value={selected.text}
                    onChange={(e) => update(selected.id, { text: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-y"
                  />

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => update(selected.id, { bold: !selected.bold })}
                      className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-colors ${
                        selected.bold ? 'bg-black text-white border-black' : 'border-border hover:bg-muted'
                      }`}
                      aria-label="Bold"
                      aria-pressed={selected.bold}
                    >
                      <Bold className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => update(selected.id, { italic: !selected.italic })}
                      className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-colors ${
                        selected.italic ? 'bg-black text-white border-black' : 'border-border hover:bg-muted'
                      }`}
                      aria-label="Italic"
                      aria-pressed={selected.italic}
                    >
                      <Italic className="w-4 h-4" />
                    </button>

                    <label className="inline-flex items-center gap-1.5 text-sm">
                      <Type className="w-4 h-4 text-muted-foreground" />
                      <input
                        type="number"
                        min={4}
                        max={96}
                        step={0.5}
                        value={Math.round(selected.fontSize * 10) / 10}
                        onChange={(e) => update(selected.id, { fontSize: Math.min(96, Math.max(4, Number(e.target.value) || 12)) })}
                        className="w-16 px-2 py-1.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        aria-label="Font size"
                      />
                    </label>

                    <select
                      value={selected.family}
                      onChange={(e) => update(selected.id, { family: e.target.value as FontFamily })}
                      className="px-2 py-1.5 border border-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                      aria-label="Font"
                    >
                      {FAMILIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {SWATCHES.map(hex => (
                      <button
                        key={hex}
                        onClick={() => update(selected.id, { color: hexToRgb(hex) })}
                        className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                          rgbToHex(selected.color).toLowerCase() === hex ? 'border-primary ring-2 ring-primary/25' : 'border-gray-300'
                        }`}
                        style={{ backgroundColor: hex }}
                        aria-label={`Colour ${hex}`}
                      />
                    ))}
                    <input
                      type="color"
                      value={rgbToHex(selected.color)}
                      onChange={(e) => update(selected.id, { color: hexToRgb(e.target.value) })}
                      className="w-8 h-6 rounded border border-border cursor-pointer bg-white"
                      aria-label="Custom colour"
                    />
                  </div>

                  {dropped.length > 0 && (
                    <p className="text-xs text-amber-700 flex items-start gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>{dropped.join(' ')} can&apos;t be written with the built-in PDF fonts and will be dropped.</span>
                    </p>
                  )}
                  {overflowing && (
                    <p className="text-xs text-amber-700 flex items-start gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>Longer than the text it replaces — check the preview for overlap.</span>
                    </p>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    {selected.added ? (
                      <button
                        onClick={() => { setBlocks(prev => prev.filter(b => b.id !== selected.id)); setSelectedId(null); }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border hover:bg-white transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove
                      </button>
                    ) : (
                      <button
                        onClick={() => update(selected.id, { deleted: !selected.deleted })}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                          selected.deleted ? 'bg-black text-white border-black' : 'border-border hover:bg-white'
                        }`}
                      >
                        {selected.deleted ? <><Undo2 className="w-3.5 h-3.5" /> Restore</> : <><Trash2 className="w-3.5 h-3.5" /> Delete</>}
                      </button>
                    )}
                    {!selected.added && isChanged(selected) && (
                      <button
                        onClick={() => update(selected.id, { text: selected.original, deleted: false })}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border hover:bg-white transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Revert
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Every text block on this page */}
              <div className="flex-1 overflow-y-auto p-2 min-h-[12rem]">
                {loading && pageBlocks.length === 0 && (
                  <p className="text-sm text-muted-foreground p-3 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Reading the page...
                  </p>
                )}
                {!loading && pageBlocks.length === 0 && (
                  <div className="p-3">
                    <p className="text-sm text-muted-foreground mb-2">No editable text on this page.</p>
                    <p className="text-xs text-muted-foreground">
                      It is probably a scan — run{' '}
                      <Link href="/tools/ocr-pdf" className="underline hover:text-foreground">OCR PDF</Link>{' '}
                      first to turn the picture into text, or use Add text to write on top.
                    </p>
                  </div>
                )}
                {pageBlocks.map(block => (
                  <button
                    key={block.id}
                    onClick={() => setSelectedId(block.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg mb-0.5 transition-colors ${
                      block.id === selectedId ? 'bg-primary/10 ring-1 ring-primary/30' : 'hover:bg-muted'
                    }`}
                  >
                    <span
                      className={`block text-sm truncate ${block.deleted ? 'line-through text-muted-foreground' : 'text-foreground'}`}
                      style={{
                        fontWeight: block.bold ? 700 : 400,
                        fontStyle: block.italic ? 'italic' : 'normal',
                        fontFamily: FAMILIES.find(f => f.value === block.family)?.css,
                      }}
                    >
                      {block.text || '(empty)'}
                    </span>
                    {isChanged(block) && (
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-primary">
                        {block.added ? 'added' : block.deleted ? 'deleted' : 'edited'}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <div className="p-4 border-t border-border space-y-3">
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                    <p className="text-xs text-destructive">{error}</p>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {changes.length === 0 ? 'No changes yet' : `${changes.length} change${changes.length === 1 ? '' : 's'}`}
                  </span>
                  {changes.length > 0 && (
                    <button
                      onClick={() => {
                        setBlocks(prev => prev.filter(b => !b.added).map(b => ({ ...b, text: b.original, deleted: false })));
                        setSelectedId(null);
                        setDone(false);
                      }}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Discard all
                    </button>
                  )}
                </div>
                <button
                  onClick={handleDownload}
                  disabled={processing || changes.length === 0}
                  className={`w-full px-6 py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                    done ? 'bg-green-500 text-white' : 'bg-primary hover:bg-primary-hover text-white'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {processing ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> :
                   done ? <><Check className="w-4 h-4" /> Downloaded</> :
                   <><Download className="w-4 h-4" /> Save edited PDF</>}
                </button>
              </div>
            </aside>

            {/* Live preview */}
            <section className="bg-white rounded-2xl border border-border shadow-sm p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Live preview</h2>
                  <p className="text-xs text-muted-foreground">
                    Rendered from the actual edited PDF — this is what downloads.
                  </p>
                </div>
                {previewBusy && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Updating
                  </span>
                )}
              </div>

              <div className="bg-gray-100 rounded-xl p-4 sm:p-6 flex justify-center min-h-[24rem]">
                {previewUrl && page ? (
                  <div
                    className={`relative inline-block max-w-full shadow-lg ${placing ? 'cursor-crosshair' : ''}`}
                    onClick={placeText}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={previewUrl} alt={`Page ${pageIndex + 1}`} className="block max-w-full h-auto rounded" />
                    {!placing && pageBlocks.map(block => {
                      const width = block.width > 0 ? block.width : block.fontSize * Math.max(4, block.text.length) * 0.5;
                      return (
                        <button
                          key={block.id}
                          onClick={(e) => { e.stopPropagation(); setSelectedId(block.id); }}
                          title={block.text}
                          className={`absolute rounded-sm transition-colors ${
                            block.id === selectedId
                              ? 'bg-primary/20 ring-2 ring-primary'
                              : isChanged(block)
                                ? 'bg-amber-300/25 hover:bg-amber-300/40'
                                : 'hover:bg-primary/15'
                          }`}
                          style={{
                            left: `${(block.x / page.width) * 100}%`,
                            top: `${((page.height - block.y - block.fontSize * 0.8) / page.height) * 100}%`,
                            width: `${Math.min(100, (width / page.width) * 100)}%`,
                            height: `${((block.fontSize * 1.1) / page.height) * 100}%`,
                          }}
                          aria-label={`Edit: ${block.text.slice(0, 40)}`}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex items-center gap-3 text-sm text-muted-foreground self-center">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Preparing the page...
                  </div>
                )}
              </div>

              <p className="text-xs text-muted-foreground mt-4">
                Click any text on the page to edit it. Edited text is redrawn in a standard PDF font, so it may not
                match the original typeface exactly — the preview shows precisely what you will get.
              </p>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
