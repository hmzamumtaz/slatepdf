'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Loader2, Check, AlertCircle, Bold, Italic, Trash2, RotateCcw,
  Download, ChevronLeft, ChevronRight, Plus, AlertTriangle, Undo2,
  Replace, MoveDiagonal, Minus, ScanText,
} from 'lucide-react';
import { getPdfJs } from '@/lib/pdf-engine';
import { friendlyError } from '@/lib/errors';
import {
  openEditableDocument, buildEditedPdf, isChanged, isImageChanged,
  rgbToHex, hexToRgb, normaliseFontName,
  type EditorSession, type LoadedPage, type TextBlock, type ImageObject, type FontFamily, type Rgb,
} from '@/lib/pdf-editor';
import { unsupportedCharacters } from '@/lib/unicode-font';

/**
 * The document is the editor.
 *
 * Everything is edited where it sits: click a line on the page and type into it,
 * drag a picture to move it. The page underneath is a render of the real edited
 * PDF, so what is on screen is what downloads — and while a change is still
 * being written, the run being typed into is drawn over the page in the
 * document's own font, at its own size and colour, on its own paper colour.
 */

const FALLBACKS: Record<FontFamily, string> = {
  Helvetica: 'Arial, Helvetica, sans-serif',
  Times: '"Times New Roman", Times, serif',
  Courier: '"Courier New", Courier, monospace',
};

const FAMILY_LABELS: { value: FontFamily; label: string }[] = [
  { value: 'Helvetica', label: 'Sans' },
  { value: 'Times', label: 'Serif' },
  { value: 'Courier', label: 'Mono' },
];

const SWATCHES = ['#000000', '#404040', '#b91c1c', '#c2410c', '#047857', '#1d4ed8', '#6d28d9', '#ffffff'];

/** Where a glyph's baseline sits inside a line box of the same size. */
const BASELINE = 0.8;

const messageOf = (_err: unknown, _fallback: string) => friendlyError(_err);
const round = (v: number) => Math.round(v * 10) / 10;
const css = ({ r, g, b }: Rgb) => `rgb(${Math.round(r)} ${Math.round(g)} ${Math.round(b)})`;

/** 2D affine transforms, in the same six-number order as PDF and CSS use. */
type M = [number, number, number, number, number, number];

/** Apply b first, then a. */
const composeM = (a: M, b: M): M => [
  a[0] * b[0] + a[2] * b[1],
  a[1] * b[0] + a[3] * b[1],
  a[0] * b[2] + a[2] * b[3],
  a[1] * b[2] + a[3] * b[3],
  a[0] * b[4] + a[2] * b[5] + a[4],
  a[1] * b[4] + a[3] * b[5] + a[5],
];

/** The direction part only — for turning a drag in pixels into page points. */
const unrotate = (m: M, dx: number, dy: number): [number, number] => {
  const determinant = m[0] * m[3] - m[1] * m[2];
  if (!determinant) return [dx, dy];
  return [
    (m[3] * dx - m[2] * dy) / determinant,
    (m[0] * dy - m[1] * dx) / determinant,
  ];
};

const PRIMARY = '#6366f1';
const DANGER = '#dc2626';

let ruler: CanvasRenderingContext2D | null = null;
function measure(text: string, font: string): number {
  if (!ruler) ruler = document.createElement('canvas').getContext('2d');
  if (!ruler) return 0;
  ruler.font = font;
  return ruler.measureText(text).width;
}

type Drag =
  | { kind: 'move'; id: string; startX: number; startY: number; box: ImageObject['box'] }
  | { kind: 'resize'; id: string; startX: number; startY: number; box: ImageObject['box'] };

export interface PdfEditorProps {
  /**
   * The document to edit. All of the editor's state belongs to one document, so
   * callers that swap documents must remount it — give it a `key` that changes
   * with the file rather than expecting it to reset itself.
   */
  file: File;
  /** Called with the edited bytes when the save button is pressed. */
  onSave: (bytes: Uint8Array) => void | Promise<void>;
  saveLabel?: string;
  savedLabel?: string;
  /** Rendered in the toolbar beside the file name, e.g. a "Change" button. */
  toolbarExtra?: React.ReactNode;
  /** Tailwind height for the whole editor card. */
  heightClass?: string;
}

export default function PdfEditor({
  file,
  onSave,
  saveLabel = 'Save edited PDF',
  savedLabel = 'Downloaded',
  toolbarExtra,
  heightClass = 'h-[calc(100vh-11rem)]',
}: PdfEditorProps) {
  const [session, setSession] = useState<EditorSession | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [page, setPage] = useState<LoadedPage | null>(null);
  const [blocks, setBlocks] = useState<TextBlock[]>([]);
  const [images, setImages] = useState<ImageObject[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(false);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [notes, setNotes] = useState<{ rebuilt: number[]; substituted: boolean }>({ rebuilt: [], substituted: false });

  const [available, setAvailable] = useState({ width: 900, height: 700 });
  const [zoom, setZoom] = useState(1);
  const [faces, setFaces] = useState<Map<string, string>>(new Map());

  const previewToken = useRef(0);
  const addedCount = useRef(0);
  const drag = useRef<Drag | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputs = useRef(new Map<string, HTMLInputElement>());
  const focused = useRef<string | null>(null);
  const replaceTarget = useRef<string | null>(null);
  const replaceInput = useRef<HTMLInputElement>(null);

  const pageBlocks = useMemo(() => blocks.filter(b => b.page === pageIndex), [blocks, pageIndex]);
  const pageImages = useMemo(() => images.filter(i => i.page === pageIndex), [images, pageIndex]);
  const selectedBlock = useMemo(() => pageBlocks.find(b => b.id === selectedId) ?? null, [pageBlocks, selectedId]);
  const selectedImage = useMemo(() => pageImages.find(i => i.id === selectedId) ?? null, [pageImages, selectedId]);
  const changeCount = useMemo(
    () => blocks.filter(isChanged).length + images.filter(isImageChanged).length,
    [blocks, images],
  );

  // Fit the whole page by default, so nothing needs scrolling to be found.
  const scale = page
    ? Math.min(available.width / page.width, available.height / page.height, 2) * zoom
    : 1;
  // PDF user space to pixels on screen, including whatever /Rotate the page has.
  const view = useMemo<M>(() => {
    const t = page?.transform ?? [1, 0, 0, -1, 0, 0];
    return [t[0] * scale, t[1] * scale, t[2] * scale, t[3] * scale, t[4] * scale, t[5] * scale];
  }, [page, scale]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const opened = await openEditableDocument(file);
        if (cancelled) { opened.destroy(); return; }
        setSession(opened);
      } catch (err) {
        if (!cancelled) setError(messageOf(err, 'Could not open this PDF for editing.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [file]);

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

        // Load the page's own faces so typing happens in the document's typeface.
        for (const font of loaded.fonts) {
          const family = `SlateFace-${font.key.replace(/[^a-z0-9]/gi, '')}`;
          try {
            const face = new FontFace(family, font.bytes.slice().buffer as ArrayBuffer);
            await face.load();
            if (cancelled) return;
            document.fonts.add(face);
            setFaces(prev => (prev.has(font.key) ? prev : new Map(prev).set(font.key, family)));
          } catch {
            // A face the browser will not take simply falls back to a lookalike.
          }
        }
      } catch (err) {
        if (!cancelled) setError(messageOf(err, 'Could not read that page.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [session, pageIndex]);

  // The page on screen is a render of the real edited PDF.
  useEffect(() => {
    if (!session || !page) return;
    const token = ++previewToken.current;
    const timer = setTimeout(async () => {
      setPreviewBusy(true);
      try {
        const result = await buildEditedPdf(file, blocks, images);
        if (token !== previewToken.current) return;
        setNotes({ rebuilt: result.rebuiltPages, substituted: result.substituted });

        const pdfjsLib = await getPdfJs();
        const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(result.bytes) }).promise;
        const rendered = await pdf.getPage(pageIndex + 1);
        const base = rendered.getViewport({ scale: 1 });
        const renderScale = Math.min(2, 1600 / Math.max(base.width, base.height));
        const viewport = rendered.getViewport({ scale: renderScale });
        const canvas = document.createElement('canvas');
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        await rendered.render({ canvasContext: canvas.getContext('2d')!, viewport, canvas }).promise;
        if (token !== previewToken.current) return;
        setPreviewUrl(canvas.toDataURL('image/jpeg', 0.92));
        setError(null);
      } catch (err) {
        if (token === previewToken.current) setError(messageOf(err, 'Could not render the page.'));
      } finally {
        if (token === previewToken.current) setPreviewBusy(false);
      }
    }, 420);
    return () => clearTimeout(timer);
  }, [session, file, blocks, images, pageIndex, page]);

  // Fit the page to the space it has.
  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      setAvailable({
        width: Math.max(320, entry.contentRect.width - 48),
        height: Math.max(320, entry.contentRect.height - 48),
      });
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedId(null);
        setPlacing(false);
        (document.activeElement as HTMLElement | null)?.blur();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Selecting a line puts the caret in it, so you can just start typing.
  useEffect(() => {
    if (!selectedId || selectedId === focused.current) return;
    const input = inputs.current.get(selectedId);
    if (input) {
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
      focused.current = selectedId;
    }
  }, [selectedId, pageBlocks]);

  const updateBlock = useCallback((id: string, patch: Partial<TextBlock>) => {
    setBlocks(prev => prev.map(b => (b.id === id ? { ...b, ...patch } : b)));
    setDone(false);
  }, []);

  /** Formatting from the bar shouldn't cost you the caret. */
  const keepCaret = useCallback((id: string) => {
    requestAnimationFrame(() => inputs.current.get(id)?.focus());
  }, []);

  const updateImage = useCallback((id: string, patch: Partial<ImageObject>) => {
    setImages(prev => prev.map(i => (i.id === id ? { ...i, ...patch } : i)));
    setDone(false);
  }, []);

  const onStageClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.dataset.paper === undefined) return; // An object on the page handled it.

    if (!placing || !page) {
      setSelectedId(null);
      return;
    }
    const rect = stageRef.current!.getBoundingClientRect();
    const [px, py] = unrotate(view, e.clientX - rect.left - view[4], e.clientY - rect.top - view[5]);
    const block: TextBlock = {
      id: `new-${addedCount.current++}`,
      page: pageIndex,
      text: 'New text',
      original: '',
      x: px,
      y: py,
      width: 0,
      fontSize: 12,
      family: 'Helvetica',
      bold: false,
      italic: false,
      color: { r: 0, g: 0, b: 0 },
      background: { r: 255, g: 255, b: 255 },
      deleted: false,
      added: true,
    };
    setBlocks(prev => [...prev, block]);
    setSelectedId(block.id);
    setPlacing(false);
    setDone(false);
  }, [placing, page, pageIndex, view]);

  // Dragging a picture moves or resizes it, in page points.
  const onPointerDown = useCallback((e: React.PointerEvent, image: ImageObject, kind: Drag['kind']) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setSelectedId(image.id);
    drag.current = { kind, id: image.id, startX: e.clientX, startY: e.clientY, box: { ...image.box } };
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const active = drag.current;
    if (!active || !stageRef.current || !page) return;
    const [dx, dy] = unrotate(view, e.clientX - active.startX, e.clientY - active.startY);

    if (active.kind === 'move') {
      updateImage(active.id, { box: { ...active.box, x: active.box.x + dx, y: active.box.y + dy } });
    } else {
      const width = Math.max(4, active.box.width + dx);
      const height = Math.max(4, active.box.height - dy);
      updateImage(active.id, { box: { x: active.box.x, y: active.box.y + active.box.height - height, width, height } });
    }
  }, [page, updateImage, view]);

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
    setProcessing(true);
    setError(null);
    try {
      const result = await buildEditedPdf(file, blocks, images);
      await onSave(result.bytes);
      setDone(true);
    } catch (err) {
      setError(messageOf(err, 'Could not save the edited PDF.'));
    } finally {
      setProcessing(false);
    }
  }, [file, blocks, images, onSave]);

  const fontOf = useCallback((block: TextBlock) => {
    const own = block.sourceFont ? faces.get(normaliseFontName(block.sourceFont)) : undefined;
    return own ? `"${own}", ${FALLBACKS[block.family]}` : FALLBACKS[block.family];
  }, [faces]);

  const dropped = selectedBlock ? unsupportedCharacters(selectedBlock.text) : [];
  return (
    <>
      <input ref={replaceInput} type="file" accept="image/png,image/jpeg" className="hidden" onChange={chooseReplacement} />

      <div className={`bg-white rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col ${heightClass} min-h-[34rem]`}>
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 border-b border-border shrink-0">
              <p className="text-[13px] font-medium text-foreground truncate max-w-[12rem]" title={file.name}>
                {file.name}
              </p>
              {toolbarExtra}

              <span className="w-px h-5 bg-border" />

              <div className="flex items-center gap-1">
                <button
                  onClick={() => { setPageIndex(i => Math.max(0, i - 1)); setSelectedId(null); }}
                  disabled={pageIndex === 0}
                  className="w-7 h-7 rounded-md border border-border flex items-center justify-center hover:bg-muted disabled:opacity-40 transition-colors"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs text-muted-foreground tabular-nums px-1">
                  {pageIndex + 1} / {session?.numPages ?? '—'}
                </span>
                <button
                  onClick={() => { setPageIndex(i => Math.min((session?.numPages ?? 1) - 1, i + 1)); setSelectedId(null); }}
                  disabled={!session || pageIndex >= session.numPages - 1}
                  className="w-7 h-7 rounded-md border border-border flex items-center justify-center hover:bg-muted disabled:opacity-40 transition-colors"
                  aria-label="Next page"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setZoom(z => Math.max(0.5, round(z - 0.15)))}
                  className="w-7 h-7 rounded-md border border-border flex items-center justify-center hover:bg-muted transition-colors"
                  aria-label="Zoom out"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setZoom(1)}
                  className="text-xs text-muted-foreground tabular-nums px-1 hover:text-foreground transition-colors"
                  aria-label="Fit page"
                >
                  {Math.round(zoom * 100)}%
                </button>
                <button
                  onClick={() => setZoom(z => Math.min(2.5, round(z + 0.15)))}
                  className="w-7 h-7 rounded-md border border-border flex items-center justify-center hover:bg-muted transition-colors"
                  aria-label="Zoom in"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <span className="w-px h-5 bg-border" />

              <button
                onClick={() => { setPlacing(p => !p); setSelectedId(null); }}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[13px] font-medium border transition-colors ${
                  placing ? 'bg-foreground text-white border-foreground' : 'border-border text-foreground hover:bg-muted'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                {placing ? 'Click the page' : 'Add text'}
              </button>

              <span className="text-xs text-muted-foreground hidden lg:inline tabular-nums">
                {pageBlocks.length} text · {pageImages.length} image{pageImages.length === 1 ? '' : 's'}
              </span>

              <div className="ml-auto flex items-center gap-3">
                {(previewBusy || loading) && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Updating
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  {changeCount === 0 ? 'No changes' : `${changeCount} change${changeCount === 1 ? '' : 's'}`}
                </span>
                {changeCount > 0 && (
                  <button
                    onClick={() => {
                      setBlocks(prev => prev.filter(b => !b.added).map(b => ({ ...b, text: b.original, deleted: false })));
                      setImages(prev => prev.map(i => ({ ...i, deleted: false, replacement: null, box: { ...i.originalBox } })));
                      setSelectedId(null);
                      setDone(false);
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Discard all
                  </button>
                )}
                <button
                  onClick={handleDownload}
                  disabled={processing || changeCount === 0}
                  className={`px-4 py-2 rounded-xl font-semibold text-[13px] transition-all flex items-center justify-center gap-2 ${
                    done ? 'bg-green-500 text-white' : 'bg-primary hover:bg-primary-hover text-white'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {processing ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> :
                   done ? <><Check className="w-4 h-4" /> {savedLabel}</> :
                   <><Download className="w-4 h-4" /> {saveLabel}</>}
                </button>
              </div>
            </div>

            {/* Always present: appearing on selection would shift the page under the pointer. */}
            <div className={`flex items-center gap-1.5 h-11 shrink-0 px-4 border-b border-border overflow-x-auto ${
              selectedBlock || selectedImage ? 'bg-foreground text-white' : 'bg-muted/40'
            }`}>
              {(selectedBlock || selectedImage) && (
                <span className="text-[11px] uppercase tracking-wide text-white/50 mr-1 shrink-0">
                  {selectedBlock ? 'Text' : 'Picture'}
                </span>
              )}
              {!selectedBlock && !selectedImage ? (
                <span className="text-[12px] text-muted-foreground">
                  Click a line on the page to edit it, or a picture to replace, move or delete it.
                </span>
              ) : selectedBlock ? (
                <>
                  <button
                    onClick={() => { updateBlock(selectedBlock.id, { bold: !selectedBlock.bold }); keepCaret(selectedBlock.id); }}
                    className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${
                      selectedBlock.bold ? 'bg-white text-foreground' : 'hover:bg-white/20'
                    }`}
                    aria-label="Bold"
                    aria-pressed={selectedBlock.bold}
                  >
                    <Bold className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => { updateBlock(selectedBlock.id, { italic: !selectedBlock.italic }); keepCaret(selectedBlock.id); }}
                    className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${
                      selectedBlock.italic ? 'bg-white text-foreground' : 'hover:bg-white/20'
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
                    onChange={(e) => updateBlock(selectedBlock.id, {
                      fontSize: Math.min(96, Math.max(4, Number(e.target.value) || 12)),
                    })}
                    className="w-12 h-7 px-1.5 rounded-md bg-white/15 text-[12px] tabular-nums outline-none focus:bg-white/25"
                    aria-label="Font size"
                  />
                  <select
                    value={selectedBlock.family}
                    onChange={(e) => updateBlock(selectedBlock.id, { family: e.target.value as FontFamily })}
                    className="h-7 px-1 rounded-md bg-white/15 text-[12px] outline-none focus:bg-white/25 [&>option]:text-foreground"
                    aria-label="Font"
                    title={selectedBlock.sourceFont
                      ? `Used when ${selectedBlock.sourceFont} cannot be reused`
                      : 'Font'}
                  >
                    {FAMILY_LABELS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>

                  <span className="w-px h-5 bg-white/25" />

                  {SWATCHES.map(hex => (
                    <button
                      key={hex}
                      onClick={() => { updateBlock(selectedBlock.id, { color: hexToRgb(hex) }); keepCaret(selectedBlock.id); }}
                      className={`w-4 h-4 rounded-full border transition-transform hover:scale-125 ${
                        rgbToHex(selectedBlock.color).toLowerCase() === hex
                          ? 'ring-2 ring-white ring-offset-1 ring-offset-foreground border-transparent'
                          : 'border-white/40'
                      }`}
                      style={{ backgroundColor: hex }}
                      aria-label={`Colour ${hex}`}
                    />
                  ))}
                  <input
                    type="color"
                    value={rgbToHex(selectedBlock.color)}
                    onChange={(e) => updateBlock(selectedBlock.id, { color: hexToRgb(e.target.value) })}
                    className="w-6 h-5 rounded border border-white/40 cursor-pointer bg-transparent"
                    aria-label="Custom colour"
                  />

                  <span className="w-px h-5 bg-white/25" />

                  {selectedBlock.added ? (
                    <button
                      onClick={() => { setBlocks(prev => prev.filter(b => b.id !== selectedBlock.id)); setSelectedId(null); }}
                      className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-white/20 transition-colors"
                      aria-label="Remove"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      onClick={() => updateBlock(selectedBlock.id, { deleted: !selectedBlock.deleted })}
                      className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${
                        selectedBlock.deleted ? 'bg-white text-foreground' : 'hover:bg-white/20'
                      }`}
                      aria-label={selectedBlock.deleted ? 'Restore' : 'Delete'}
                    >
                      {selectedBlock.deleted ? <Undo2 className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  )}
                  {!selectedBlock.added && isChanged(selectedBlock) && (
                    <button
                      onClick={() => updateBlock(selectedBlock.id, { text: selectedBlock.original, deleted: false })}
                      className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-white/20 transition-colors"
                      aria-label="Revert"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {dropped.length > 0 && (
                    <span
                      className="inline-flex items-center text-amber-300"
                      title={`${dropped.join(' ')} can't be drawn by any available font and will be dropped when saved.`}
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                    </span>
                  )}
                </>
              ) : selectedImage && (
                <>
                  <button
                    onClick={() => { replaceTarget.current = selectedImage.id; replaceInput.current?.click(); }}
                    className="inline-flex items-center gap-1.5 px-2 h-7 rounded-md text-[12px] font-medium hover:bg-white/20 transition-colors"
                  >
                    <Replace className="w-3.5 h-3.5" /> Replace
                  </button>
                  <button
                    onClick={() => updateImage(selectedImage.id, { deleted: !selectedImage.deleted })}
                    className={`inline-flex items-center gap-1.5 px-2 h-7 rounded-md text-[12px] font-medium transition-colors ${
                      selectedImage.deleted ? 'bg-white text-foreground' : 'hover:bg-white/20'
                    }`}
                  >
                    {selectedImage.deleted ? <><Undo2 className="w-3.5 h-3.5" /> Restore</> : <><Trash2 className="w-3.5 h-3.5" /> Delete</>}
                  </button>
                  {isImageChanged(selectedImage) && (
                    <button
                      onClick={() => updateImage(selectedImage.id, {
                        deleted: false,
                        replacement: null,
                        box: { ...selectedImage.originalBox },
                      })}
                      className="inline-flex items-center gap-1.5 px-2 h-7 rounded-md text-[12px] font-medium hover:bg-white/20 transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Revert
                    </button>
                  )}
                  <span className="w-px h-5 bg-white/25" />
                  <span className="text-[11px] tabular-nums text-white/70 px-1">
                    {round(selectedImage.box.width)} × {round(selectedImage.box.height)} pt
                  </span>
                  {selectedImage.rotated && (
                    <span
                      className="inline-flex items-center text-amber-300"
                      title="This picture is rotated on the page — a replacement is placed upright."
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                    </span>
                  )}
                </>
              )}
            </div>

            {error && (
              <div className="px-4 py-2.5 bg-red-50 border-b border-red-200 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-[13px] text-destructive">{error}</p>
              </div>
            )}

            {!loading && page && pageBlocks.length === 0 && (
              <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-200 flex items-start gap-2">
                <ScanText className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <p className="text-[13px] text-amber-800">
                  No editable text on this page — it is probably a scan. Run{' '}
                  <Link href="/tools/ocr-pdf" className="underline">OCR PDF</Link>{' '}
                  first to turn the picture into text, or use Add text to write on top. Pictures can still be swapped.
                </p>
              </div>
            )}

            {/* The document itself */}
            <div ref={scrollRef} className="bg-gray-200/70 p-6 overflow-auto flex-1 min-h-0">
              {previewUrl && page ? (
                <div
                  ref={stageRef}
                  data-paper=""
                  onClick={onStageClick}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  className={`relative mx-auto bg-white shadow-xl ${placing ? 'cursor-crosshair' : ''}`}
                  style={{ width: page.width * scale, height: page.height * scale }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt={`Page ${pageIndex + 1}`}
                    data-paper=""
                    draggable={false}
                    className="absolute inset-0 w-full h-full select-none"
                  />

                  {pageImages.map(image => {
                    const m = composeM(view, [1, 0, 0, -1, image.box.x, image.box.y + image.box.height]);
                    const hair = 1 / scale;
                    const handle = 15 / scale;
                    return (
                      <div
                        key={image.id}
                        onPointerDown={(e) => onPointerDown(e, image, 'move')}
                        title="Drag to move · corner to resize"
                        className={`absolute top-0 left-0 origin-top-left transition-colors ${
                          placing ? 'pointer-events-none' : 'cursor-move'
                        } ${image.id === selectedId && !image.deleted ? 'bg-primary/10' : 'hover:bg-primary/10'}`}
                        style={{
                          transform: `matrix(${m.join(',')})`,
                          width: image.box.width,
                          height: image.box.height,
                          outline: image.deleted
                            ? `${hair * 2}px dashed ${DANGER}`
                            : image.id === selectedId
                              ? `${hair * 2}px solid ${PRIMARY}`
                              : `${hair}px solid ${PRIMARY}44`,
                          backgroundColor: image.deleted ? `${DANGER}1a` : undefined,
                        }}
                      >
                        {image.id === selectedId && !image.deleted && (
                          <span
                            onPointerDown={(e) => onPointerDown(e, image, 'resize')}
                            className="absolute rounded-sm bg-primary text-white flex items-center justify-center cursor-nwse-resize"
                            style={{
                              width: handle,
                              height: handle,
                              right: -handle / 2,
                              bottom: -handle / 2,
                            }}
                          >
                            <MoveDiagonal style={{ width: handle * 0.6, height: handle * 0.6 }} />
                          </span>
                        )}
                      </div>
                    );
                  })}

                  {pageBlocks.map(block => {
                    const size = block.fontSize;
                    const face = `${block.italic ? 'italic ' : ''}${block.bold ? '700 ' : '400 '}${size}px ${fontOf(block)}`;
                    const width = Math.max(measure(block.text || ' ', face) + 1, block.width, size);
                    const m = composeM(view, [1, 0, 0, -1, block.x, block.y + block.fontSize * BASELINE]);
                    const hair = 1 / scale;
                    // Cover the paper only while the page underneath is out of date.
                    const covering = block.id === selectedId || (isChanged(block) && previewBusy);
                    return (
                      <input
                        key={block.id}
                        ref={(node) => { if (node) inputs.current.set(block.id, node); else inputs.current.delete(block.id); }}
                        value={block.text}
                        readOnly={block.deleted}
                        spellCheck={false}
                        onChange={(e) => updateBlock(block.id, { text: e.target.value })}
                        onFocus={() => { focused.current = block.id; setSelectedId(block.id); }}
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                        title={block.deleted ? 'Deleted — restore it to edit' : block.text}
                        aria-label={`Edit: ${block.original || block.text}`}
                        className={`absolute top-0 left-0 origin-top-left p-0 m-0 border-0 bg-transparent ${
                          placing ? 'pointer-events-none' : 'cursor-text'
                        } ${block.id === selectedId ? '' : 'hover:bg-primary/10'}`}
                        style={{
                          transform: `matrix(${m.join(',')})`,
                          width,
                          height: size * 1.16,
                          lineHeight: `${size * 1.16}px`,
                          fontSize: size,
                          fontFamily: fontOf(block),
                          fontWeight: block.bold ? 700 : 400,
                          fontStyle: block.italic ? 'italic' : 'normal',
                          color: covering && !block.deleted ? css(block.color) : 'transparent',
                          backgroundColor: block.deleted
                            ? `${DANGER}14`
                            : covering ? css(block.background) : undefined,
                          caretColor: css(block.color),
                          outline: block.deleted
                            ? `${hair}px dashed ${DANGER}`
                            : block.id === selectedId
                              ? `${hair * 2}px solid ${PRIMARY}`
                              : isChanged(block)
                                ? `${hair}px solid #f59e0b`
                                : 'none',
                        }}
                      />
                    );
                  })}

                </div>
              ) : (
                <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground py-24">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Opening the document…
                </div>
              )}
            </div>

            <div className="px-4 py-3 border-t border-border space-y-1.5 shrink-0">
              {notes.rebuilt.includes(pageIndex) && (
                <p className="text-[11px] text-amber-700 flex items-start gap-1.5">
                  <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                  <span>This page&apos;s text had to be redrawn in full — check it over before saving.</span>
                </p>
              )}
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                The page above is rendered from the edited PDF itself, so it is exactly what downloads.
                Edited words are set in the document&apos;s own font wherever it can be reused.
                {notes.substituted && ' Some runs fell back to a standard font, which you can see on the page.'}
                {' '}Only the pages you change are rewritten; the rest of the file is copied through untouched.
              </p>
            </div>
      </div>
    </>
  );
}
