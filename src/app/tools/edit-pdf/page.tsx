'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Loader2, Check, AlertCircle, Bold, Italic, Trash2, RotateCcw,
  Download, ChevronLeft, ChevronRight, Plus, AlertTriangle, Undo2, ImageIcon,
  Type as TypeIcon, Replace, MoveDiagonal,
} from 'lucide-react';
import FileUpload from '@/components/FileUpload';
import { downloadBlob, getOutputFilename, getPdfJs } from '@/lib/pdf-engine';
import {
  openEditableDocument, buildEditedPdf, isChanged, isImageChanged, toWinAnsi, rgbToHex, hexToRgb,
  type EditorSession, type LoadedPage, type TextBlock, type ImageObject, type FontFamily,
} from '@/lib/pdf-editor';

const FAMILIES: { value: FontFamily; label: string; css: string }[] = [
  { value: 'Helvetica', label: 'Sans', css: 'Arial, Helvetica, sans-serif' },
  { value: 'Times', label: 'Serif', css: '"Times New Roman", Times, serif' },
  { value: 'Courier', label: 'Mono', css: '"Courier New", Courier, monospace' },
];

const SWATCHES = ['#000000', '#404040', '#b91c1c', '#c2410c', '#047857', '#1d4ed8', '#6d28d9', '#ffffff'];

const messageOf = (err: unknown, fallback: string) => (err instanceof Error && err.message ? err.message : fallback);
const round = (v: number) => Math.round(v * 10) / 10;

type Tab = 'text' | 'images';
type Drag =
  | { kind: 'move'; id: string; startX: number; startY: number; box: ImageObject['box'] }
  | { kind: 'resize'; id: string; startX: number; startY: number; box: ImageObject['box'] };

export default function EditPdfPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [session, setSession] = useState<EditorSession | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [page, setPage] = useState<LoadedPage | null>(null);
  const [blocks, setBlocks] = useState<TextBlock[]>([]);
  const [images, setImages] = useState<ImageObject[]>([]);
  const [tab, setTab] = useState<Tab>('text');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(false);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [notes, setNotes] = useState<{ rebuilt: number[]; substituted: boolean }>({ rebuilt: [], substituted: false });

  const previewToken = useRef(0);
  const addedCount = useRef(0);
  const drag = useRef<Drag | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const replaceTarget = useRef<string | null>(null);
  const replaceInput = useRef<HTMLInputElement>(null);

  const pageBlocks = useMemo(() => blocks.filter(b => b.page === pageIndex), [blocks, pageIndex]);
  const pageImages = useMemo(() => images.filter(i => i.page === pageIndex), [images, pageIndex]);
  const selectedBlock = useMemo(() => blocks.find(b => b.id === selectedId) ?? null, [blocks, selectedId]);
  const selectedImage = useMemo(() => images.find(i => i.id === selectedId) ?? null, [images, selectedId]);
  const changeCount = useMemo(
    () => blocks.filter(isChanged).length + images.filter(isImageChanged).length,
    [blocks, images],
  );

  const reset = useCallback(() => {
    setSession(null); setPage(null); setBlocks([]); setImages([]); setSelectedId(null);
    setPageIndex(0); setPreviewUrl(null); setDone(false); setError(null); setPlacing(false);
    setNotes({ rebuilt: [], substituted: false });
    addedCount.current = 0;
  }, []);

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
      } catch (err) {
        if (!cancelled) setError(messageOf(err, 'Could not open this PDF for editing.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [files]);

  // Read each page the first time it is visited, keeping edits already made.
  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const loaded = await session.getPage(pageIndex);
        if (cancelled) return;
        setPage(loaded);
        setBlocks(prev => (prev.some(b => b.page === pageIndex) ? prev : [...prev, ...loaded.blocks]));
        setImages(prev => (prev.some(i => i.page === pageIndex) ? prev : [...prev, ...loaded.images]));
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
        const result = await buildEditedPdf(files[0], blocks, images);
        if (token !== previewToken.current) return;
        setNotes({ rebuilt: result.rebuiltPages, substituted: result.substituted });

        const pdfjsLib = await getPdfJs();
        const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(result.bytes) }).promise;
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
        setError(null);
      } catch (err) {
        if (token === previewToken.current) setError(messageOf(err, 'Could not render the preview.'));
      } finally {
        if (token === previewToken.current) setPreviewBusy(false);
      }
    }, 420);
    return () => clearTimeout(timer);
  }, [session, files, blocks, images, pageIndex, page]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setSelectedId(null); setPlacing(false); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const updateBlock = useCallback((id: string, patch: Partial<TextBlock>) => {
    setBlocks(prev => prev.map(b => (b.id === id ? { ...b, ...patch } : b)));
    setDone(false);
  }, []);

  const updateImage = useCallback((id: string, patch: Partial<ImageObject>) => {
    setImages(prev => prev.map(i => (i.id === id ? { ...i, ...patch } : i)));
    setDone(false);
  }, []);

  const placeText = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!placing || !page) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const block: TextBlock = {
      id: `new-${addedCount.current++}`,
      page: pageIndex,
      text: 'New text',
      original: '',
      x: ((e.clientX - rect.left) / rect.width) * page.width,
      y: page.height - ((e.clientY - rect.top) / rect.height) * page.height,
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
    setTab('text');
    setSelectedId(block.id);
    setPlacing(false);
    setDone(false);
  }, [placing, page, pageIndex]);

  // Dragging an image on the preview moves or resizes it in page points.
  const onPointerDown = useCallback((e: React.PointerEvent, image: ImageObject, kind: Drag['kind']) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setTab('images');
    setSelectedId(image.id);
    drag.current = { kind, id: image.id, startX: e.clientX, startY: e.clientY, box: { ...image.box } };
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const active = drag.current;
    const stage = stageRef.current;
    if (!active || !stage || !page) return;
    const rect = stage.getBoundingClientRect();
    const dx = ((e.clientX - active.startX) / rect.width) * page.width;
    const dy = ((e.clientY - active.startY) / rect.height) * page.height;

    if (active.kind === 'move') {
      updateImage(active.id, { box: { ...active.box, x: active.box.x + dx, y: active.box.y - dy } });
    } else {
      const width = Math.max(4, active.box.width + dx);
      const height = Math.max(4, active.box.height - dy);
      updateImage(active.id, { box: { x: active.box.x, y: active.box.y + active.box.height - height, width, height } });
    }
  }, [page, updateImage]);

  const onPointerUp = useCallback(() => { drag.current = null; }, []);

  const chooseReplacement = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const id = replaceTarget.current;
    e.target.value = '';
    if (!file || !id) return;
    if (!/^image\/(png|jpeg|jpg)$/.test(file.type)) {
      setError('Replacement images need to be a PNG or a JPEG.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => updateImage(id, { replacement: { dataUrl: reader.result as string, name: file.name } });
    reader.readAsDataURL(file);
  }, [updateImage]);

  const handleDownload = useCallback(async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setError(null);
    try {
      const result = await buildEditedPdf(files[0], blocks, images);
      downloadBlob(new Blob([result.bytes as unknown as BlobPart], { type: 'application/pdf' }), getOutputFilename('edit-pdf', '.pdf'));
      setDone(true);
    } catch (err) {
      setError(messageOf(err, 'Could not save the edited PDF.'));
    } finally {
      setProcessing(false);
    }
  }, [files, blocks, images]);

  const dropped = selectedBlock ? toWinAnsi(selectedBlock.text).dropped : [];

  return (
    <div className="min-h-screen bg-gray-50/50">
      <input ref={replaceInput} type="file" accept="image/png,image/jpeg" className="hidden" onChange={chooseReplacement} />

      <div className="max-w-[1700px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back to all tools
        </Link>

        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Edit PDF</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Rewrite the text and swap the pictures in a PDF. Everything runs in this tab — your file is never uploaded.
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
          <div className="grid lg:grid-cols-[360px_1fr] gap-5 items-start">
            {/* Editor */}
            <aside className="bg-white rounded-2xl border border-border shadow-sm flex flex-col overflow-hidden lg:sticky lg:top-24 lg:max-h-[calc(100vh-8rem)]">
              <header className="px-4 pt-4 pb-3 border-b border-border">
                <div className="flex items-baseline justify-between gap-3 mb-3">
                  <p className="text-[13px] font-medium text-foreground truncate" title={files[0].name}>{files[0].name}</p>
                  <button
                    onClick={() => { reset(); setFiles([]); }}
                    className="text-xs text-muted-foreground hover:text-foreground shrink-0 transition-colors"
                  >
                    Change
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => { setPageIndex(i => Math.max(0, i - 1)); setSelectedId(null); }}
                    disabled={pageIndex === 0}
                    className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted disabled:opacity-40 transition-colors"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="flex-1 text-center text-xs text-muted-foreground tabular-nums">
                    Page {pageIndex + 1} of {session?.numPages ?? '—'}
                  </span>
                  <button
                    onClick={() => { setPageIndex(i => Math.min((session?.numPages ?? 1) - 1, i + 1)); setSelectedId(null); }}
                    disabled={!session || pageIndex >= session.numPages - 1}
                    className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted disabled:opacity-40 transition-colors"
                    aria-label="Next page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </header>

              <div className="px-4 py-2.5 border-b border-border flex items-center gap-1">
                {([
                  { id: 'text' as Tab, icon: TypeIcon, label: 'Text', count: pageBlocks.length },
                  { id: 'images' as Tab, icon: ImageIcon, label: 'Images', count: pageImages.length },
                ]).map(({ id, icon: Icon, label, count }) => (
                  <button
                    key={id}
                    onClick={() => { setTab(id); setSelectedId(null); }}
                    className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
                      tab === id ? 'bg-foreground text-white' : 'text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                    <span className={tab === id ? 'text-white/60' : 'text-muted-foreground/70'}>{count}</span>
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto overscroll-contain">
                {loading && pageBlocks.length === 0 && pageImages.length === 0 && (
                  <p className="text-[13px] text-muted-foreground px-4 py-6 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Reading the page…
                  </p>
                )}

                {tab === 'text' && (
                  <>
                    <div className="px-3 pt-3">
                      <button
                        onClick={() => { setPlacing(p => !p); setSelectedId(null); }}
                        className={`w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium border transition-colors ${
                          placing ? 'bg-foreground text-white border-foreground' : 'border-border text-foreground hover:bg-muted'
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        {placing ? 'Click the page to place it' : 'Add text'}
                      </button>
                    </div>

                    {!loading && pageBlocks.length === 0 && (
                      <div className="px-4 py-5">
                        <p className="text-[13px] text-foreground mb-1.5">No editable text on this page.</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          It is probably a scan. Run{' '}
                          <Link href="/tools/ocr-pdf" className="underline hover:text-foreground">OCR PDF</Link>{' '}
                          first to turn the picture into text, or use Add text to write on top.
                        </p>
                      </div>
                    )}

                    <ul className="p-2">
                      {pageBlocks.map(block => {
                        const open = block.id === selectedId;
                        return (
                          <li key={block.id} className={`rounded-xl mb-1 ${open ? 'bg-muted/60 ring-1 ring-border' : ''}`}>
                            <button
                              onClick={() => setSelectedId(open ? null : block.id)}
                              className={`w-full text-left px-3 py-2 rounded-xl transition-colors ${open ? '' : 'hover:bg-muted'}`}
                            >
                              <span
                                className={`block text-[13px] leading-snug line-clamp-2 ${
                                  block.deleted ? 'line-through text-muted-foreground' : 'text-foreground'
                                }`}
                                style={{
                                  fontWeight: block.bold ? 600 : 400,
                                  fontStyle: block.italic ? 'italic' : 'normal',
                                  fontFamily: FAMILIES.find(f => f.value === block.family)?.css,
                                }}
                              >
                                {block.text || '(empty)'}
                              </span>
                              {isChanged(block) && (
                                <span className="mt-1 inline-block text-[10px] font-semibold uppercase tracking-wide text-primary">
                                  {block.added ? 'added' : block.deleted ? 'deleted' : 'edited'}
                                </span>
                              )}
                            </button>

                            {open && selectedBlock && (
                              <div className="px-3 pb-3 space-y-2.5">
                                <textarea
                                  value={selectedBlock.text}
                                  onChange={(e) => updateBlock(selectedBlock.id, { text: e.target.value })}
                                  rows={3}
                                  className="w-full px-2.5 py-2 bg-white border border-border rounded-lg text-[13px] leading-snug focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-y"
                                />

                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => updateBlock(selectedBlock.id, { bold: !selectedBlock.bold })}
                                    className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors ${
                                      selectedBlock.bold ? 'bg-foreground text-white border-foreground' : 'bg-white border-border hover:bg-muted'
                                    }`}
                                    aria-label="Bold"
                                    aria-pressed={selectedBlock.bold}
                                  >
                                    <Bold className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => updateBlock(selectedBlock.id, { italic: !selectedBlock.italic })}
                                    className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors ${
                                      selectedBlock.italic ? 'bg-foreground text-white border-foreground' : 'bg-white border-border hover:bg-muted'
                                    }`}
                                    aria-label="Italic"
                                    aria-pressed={selectedBlock.italic}
                                  >
                                    <Italic className="w-3.5 h-3.5" />
                                  </button>
                                  <input
                                    type="number"
                                    min={4}
                                    max={96}
                                    step={0.5}
                                    value={round(selectedBlock.fontSize)}
                                    onChange={(e) => updateBlock(selectedBlock.id, { fontSize: Math.min(96, Math.max(4, Number(e.target.value) || 12)) })}
                                    className="w-14 h-8 px-2 bg-white border border-border rounded-lg text-[13px] tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    aria-label="Font size"
                                  />
                                  <select
                                    value={selectedBlock.family}
                                    onChange={(e) => updateBlock(selectedBlock.id, { family: e.target.value as FontFamily })}
                                    className="h-8 px-1.5 bg-white border border-border rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    aria-label="Font"
                                  >
                                    {FAMILIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                                  </select>
                                </div>

                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {SWATCHES.map(hex => (
                                    <button
                                      key={hex}
                                      onClick={() => updateBlock(selectedBlock.id, { color: hexToRgb(hex) })}
                                      className={`w-5 h-5 rounded-full border transition-transform hover:scale-110 ${
                                        rgbToHex(selectedBlock.color).toLowerCase() === hex
                                          ? 'ring-2 ring-primary ring-offset-1 border-transparent'
                                          : 'border-gray-300'
                                      }`}
                                      style={{ backgroundColor: hex }}
                                      aria-label={`Colour ${hex}`}
                                    />
                                  ))}
                                  <input
                                    type="color"
                                    value={rgbToHex(selectedBlock.color)}
                                    onChange={(e) => updateBlock(selectedBlock.id, { color: hexToRgb(e.target.value) })}
                                    className="w-7 h-5 rounded border border-border cursor-pointer bg-white"
                                    aria-label="Custom colour"
                                  />
                                </div>

                                {dropped.length > 0 && (
                                  <p className="text-[11px] text-amber-700 flex items-start gap-1.5 leading-snug">
                                    <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                                    <span>{dropped.join(' ')} isn&apos;t in the substitute font and will be dropped.</span>
                                  </p>
                                )}

                                <div className="flex items-center gap-1.5">
                                  {selectedBlock.added ? (
                                    <button
                                      onClick={() => { setBlocks(prev => prev.filter(b => b.id !== selectedBlock.id)); setSelectedId(null); }}
                                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium bg-white border border-border hover:bg-muted transition-colors"
                                    >
                                      <Trash2 className="w-3 h-3" /> Remove
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => updateBlock(selectedBlock.id, { deleted: !selectedBlock.deleted })}
                                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium border transition-colors ${
                                        selectedBlock.deleted ? 'bg-foreground text-white border-foreground' : 'bg-white border-border hover:bg-muted'
                                      }`}
                                    >
                                      {selectedBlock.deleted ? <><Undo2 className="w-3 h-3" /> Restore</> : <><Trash2 className="w-3 h-3" /> Delete</>}
                                    </button>
                                  )}
                                  {!selectedBlock.added && isChanged(selectedBlock) && (
                                    <button
                                      onClick={() => updateBlock(selectedBlock.id, { text: selectedBlock.original, deleted: false })}
                                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium bg-white border border-border hover:bg-muted transition-colors"
                                    >
                                      <RotateCcw className="w-3 h-3" /> Revert
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </>
                )}

                {tab === 'images' && (
                  <>
                    {!loading && pageImages.length === 0 && (
                      <p className="px-4 py-5 text-[13px] text-muted-foreground">No images on this page.</p>
                    )}
                    <ul className="p-2">
                      {pageImages.map(image => {
                        const open = image.id === selectedId;
                        return (
                          <li key={image.id} className={`rounded-xl mb-1 ${open ? 'bg-muted/60 ring-1 ring-border' : ''}`}>
                            <button
                              onClick={() => { setSelectedId(open ? null : image.id); }}
                              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-colors ${open ? '' : 'hover:bg-muted'}`}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={image.replacement?.dataUrl ?? image.thumbnail}
                                alt=""
                                className={`w-11 h-11 object-contain rounded-md bg-white border border-border shrink-0 ${image.deleted ? 'opacity-30' : ''}`}
                              />
                              <span className="min-w-0">
                                <span className="block text-[13px] text-foreground">
                                  {round(image.box.width)} × {round(image.box.height)} pt
                                </span>
                                {isImageChanged(image) && (
                                  <span className="text-[10px] font-semibold uppercase tracking-wide text-primary">
                                    {image.deleted ? 'deleted' : image.replacement ? 'replaced' : 'moved'}
                                  </span>
                                )}
                              </span>
                            </button>

                            {open && selectedImage && (
                              <div className="px-3 pb-3 space-y-2.5">
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => { replaceTarget.current = selectedImage.id; replaceInput.current?.click(); }}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium bg-white border border-border hover:bg-muted transition-colors"
                                  >
                                    <Replace className="w-3 h-3" /> Replace
                                  </button>
                                  <button
                                    onClick={() => updateImage(selectedImage.id, { deleted: !selectedImage.deleted })}
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium border transition-colors ${
                                      selectedImage.deleted ? 'bg-foreground text-white border-foreground' : 'bg-white border-border hover:bg-muted'
                                    }`}
                                  >
                                    {selectedImage.deleted ? <><Undo2 className="w-3 h-3" /> Restore</> : <><Trash2 className="w-3 h-3" /> Delete</>}
                                  </button>
                                  {isImageChanged(selectedImage) && (
                                    <button
                                      onClick={() => updateImage(selectedImage.id, {
                                        deleted: false,
                                        replacement: null,
                                        box: { ...selectedImage.originalBox },
                                      })}
                                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium bg-white border border-border hover:bg-muted transition-colors"
                                    >
                                      <RotateCcw className="w-3 h-3" /> Revert
                                    </button>
                                  )}
                                </div>

                                {selectedImage.replacement && (
                                  <p className="text-[11px] text-muted-foreground truncate">
                                    Using {selectedImage.replacement.name}
                                  </p>
                                )}

                                <div className="grid grid-cols-2 gap-1.5">
                                  {([
                                    ['x', 'X'], ['y', 'Y'], ['width', 'Width'], ['height', 'Height'],
                                  ] as const).map(([key, label]) => (
                                    <label key={key} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                      <span className="w-10">{label}</span>
                                      <input
                                        type="number"
                                        step={1}
                                        value={round(selectedImage.box[key])}
                                        onChange={(e) => updateImage(selectedImage.id, {
                                          box: { ...selectedImage.box, [key]: Number(e.target.value) || 0 },
                                        })}
                                        className="w-full h-7 px-1.5 bg-white border border-border rounded-md text-[12px] tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/20"
                                      />
                                    </label>
                                  ))}
                                </div>

                                {selectedImage.rotated && (
                                  <p className="text-[11px] text-amber-700 flex items-start gap-1.5 leading-snug">
                                    <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                                    <span>This picture is rotated on the page — a replacement is placed upright.</span>
                                  </p>
                                )}
                                <p className="text-[11px] text-muted-foreground leading-snug">
                                  Drag it on the preview to move, or the corner handle to resize.
                                </p>
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </>
                )}
              </div>

              <footer className="px-4 py-3 border-t border-border space-y-2.5 bg-white">
                {error && (
                  <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                    <AlertCircle className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
                    <p className="text-[11px] text-destructive leading-snug">{error}</p>
                  </div>
                )}
                {notes.rebuilt.includes(pageIndex) && (
                  <p className="text-[11px] text-amber-700 flex items-start gap-1.5 leading-snug">
                    <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                    <span>This page&apos;s text had to be redrawn in full — check the preview.</span>
                  </p>
                )}
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-muted-foreground">
                    {changeCount === 0 ? 'No changes yet' : `${changeCount} change${changeCount === 1 ? '' : 's'}`}
                  </span>
                  {changeCount > 0 && (
                    <button
                      onClick={() => {
                        setBlocks(prev => prev.filter(b => !b.added).map(b => ({ ...b, text: b.original, deleted: false })));
                        setImages(prev => prev.map(i => ({ ...i, deleted: false, replacement: null, box: { ...i.originalBox } })));
                        setSelectedId(null);
                        setDone(false);
                      }}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Discard all
                    </button>
                  )}
                </div>
                <button
                  onClick={handleDownload}
                  disabled={processing || changeCount === 0}
                  className={`w-full px-5 py-2.5 rounded-xl font-semibold text-[13px] transition-all flex items-center justify-center gap-2 ${
                    done ? 'bg-green-500 text-white' : 'bg-primary hover:bg-primary-hover text-white'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {processing ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> :
                   done ? <><Check className="w-4 h-4" /> Downloaded</> :
                   <><Download className="w-4 h-4" /> Save edited PDF</>}
                </button>
              </footer>
            </aside>

            {/* Live preview */}
            <section className="bg-white rounded-2xl border border-border shadow-sm p-4 sm:p-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">Live preview</h2>
                  <p className="text-xs text-muted-foreground">
                    Rendered from the edited PDF itself — this is what downloads.
                  </p>
                </div>
                {previewBusy && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Updating
                  </span>
                )}
              </div>

              <div className="bg-gray-100 rounded-xl p-4 sm:p-6 flex justify-center min-h-[26rem]">
                {previewUrl && page ? (
                  <div
                    ref={stageRef}
                    className={`relative inline-block max-w-full shadow-lg ${placing ? 'cursor-crosshair' : ''}`}
                    onClick={placeText}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={previewUrl} alt={`Page ${pageIndex + 1}`} className="block max-w-full h-auto rounded" draggable={false} />

                    {!placing && tab === 'text' && pageBlocks.map(block => {
                      const width = block.width > 0 ? block.width : block.fontSize * Math.max(4, block.text.length) * 0.5;
                      return (
                        <button
                          key={block.id}
                          onClick={(e) => { e.stopPropagation(); setSelectedId(block.id); }}
                          title={block.text}
                          className={`absolute rounded-[2px] transition-colors ${
                            block.deleted
                              ? 'border border-dashed border-destructive bg-destructive/10'
                              : block.id === selectedId
                                ? 'bg-primary/20 ring-2 ring-primary'
                                : isChanged(block)
                                  ? 'bg-amber-300/20 hover:bg-amber-300/35'
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

                    {!placing && tab === 'images' && pageImages.map(image => (
                      <div
                        key={image.id}
                        onPointerDown={(e) => onPointerDown(e, image, 'move')}
                        className={`absolute cursor-move rounded-[2px] transition-colors ${
                          image.deleted
                            ? `border-2 border-dashed border-destructive bg-destructive/10 ${image.id === selectedId ? 'ring-2 ring-destructive/40' : ''}`
                            : image.id === selectedId
                              ? 'ring-2 ring-primary bg-primary/10'
                              : 'ring-1 ring-primary/40 hover:bg-primary/10'
                        }`}
                        style={{
                          left: `${(image.box.x / page.width) * 100}%`,
                          top: `${((page.height - image.box.y - image.box.height) / page.height) * 100}%`,
                          width: `${(image.box.width / page.width) * 100}%`,
                          height: `${(image.box.height / page.height) * 100}%`,
                        }}
                      >
                        {image.id === selectedId && (
                          <span
                            onPointerDown={(e) => onPointerDown(e, image, 'resize')}
                            className="absolute -right-1.5 -bottom-1.5 w-4 h-4 rounded-sm bg-primary text-white flex items-center justify-center cursor-nwse-resize"
                          >
                            <MoveDiagonal className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-3 text-sm text-muted-foreground self-center">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Preparing the page…
                  </div>
                )}
              </div>

              <p className="text-xs text-muted-foreground mt-4 leading-relaxed">
                Edited words are drawn with the document&apos;s own font wherever it can be reused.
                {notes.substituted && ' Some runs fell back to a standard font, which the preview shows exactly.'}
                {' '}Only the pages you change are rewritten; the rest of the file is copied through untouched.
              </p>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
