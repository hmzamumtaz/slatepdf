'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft, Camera, ChevronLeft, ChevronRight, Contact, Crop, Eraser, GripVertical, History, LayoutGrid, Loader2,
  Palette, PenLine, Pencil, RotateCw, ScanLine, ScanText, SlidersHorizontal, Trash2, Undo2, X,
} from 'lucide-react';
import type { ScanFilter } from '@/lib/document-scanner';
import { renderFilterPreview, renderPage, type ScanPage } from '@/lib/scan-session';
import CropEditor from './CropEditor';
import CleanupEditor from './CleanupEditor';
import MarkupEditor from './MarkupEditor';
import ExportPanel from './ExportPanel';
import TextSheet from './TextSheet';
import ContactSheet from './ContactSheet';

export const FILTERS: { value: ScanFilter; label: string }[] = [
  { value: 'enhance', label: 'Auto color' },
  { value: 'photo', label: 'Original' },
  { value: 'lighttext', label: 'Light text' },
  { value: 'grayscale', label: 'Grayscale' },
  { value: 'bw', label: 'B&W' },
  { value: 'whiteboard', label: 'Whiteboard' },
];

type Edit = Partial<Pick<ScanPage, 'parts' | 'rotation' | 'filter' | 'brightness' | 'contrast' | 'strokes' | 'marks'>>;

interface Props {
  pages: ScanPage[];
  index: number;
  onIndex: (i: number) => void;
  docName: string;
  onDocName: (name: string) => void;
  /** Open the crop editor straight away (a capture with no page edges found). */
  cropFirst?: boolean;
  onCropFirstHandled?: () => void;
  onBack: () => void;
  onAddMore: () => void;
  onRetake: (id: number) => void;
  onUpdate: (id: number, edit: Edit) => void;
  onDelete: (id: number) => void;
  onMove: (from: number, to: number) => void;
  onFilterAll: (filter: ScanFilter) => void;
  onRevert: (id: number) => void;
  canUndo: boolean;
  onUndo: () => void;
  onScanNew: () => void;
}

type Panel = 'filters' | 'adjust' | 'reorder' | 'save' | 'delete' | null;

export default function ReviewScreen(props: Props) {
  const { pages, index, onIndex, docName, onDocName, onBack, onAddMore, onRetake, onUpdate, onDelete, onMove, onFilterAll, onRevert, canUndo, onUndo, onScanNew } = props;
  const page = pages[Math.min(index, pages.length - 1)];
  const [panel, setPanel] = useState<Panel>(null);
  const [editor, setEditor] = useState<'crop' | 'cleanup' | 'markup' | 'text' | 'contact' | null>(props.cropFirst ? 'crop' : null);
  const [zoom, setZoom] = useState({ s: 1, x: 0, y: 0 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ dist: number; s: number; x: number; y: number; px: number; py: number } | null>(null);
  const lastTap = useRef(0);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  // Text recognition reads the page without markup, so highlights and ink don't garble it.
  const [ocrImage, setOcrImage] = useState<{ id: number; blob: Blob } | null>(null);
  const openOcr = (kind: 'text' | 'contact') => {
    const p = page;
    setOcrImage(null);
    setEditor(kind);
    if (!p) return;
    void renderPage({ ...p, marks: [] }).then(blob => setOcrImage({ id: p.id, blob })).catch(() => {
      if (p.out) setOcrImage({ id: p.id, blob: p.out });
    });
  };
  const [cropPart, setCropPart] = useState(0);
  const [renaming, setRenaming] = useState(false);
  const [previews, setPreviews] = useState<Partial<Record<ScanFilter, string>>>({});
  const [selected, setSelected] = useState<number | null>(null);
  const swipeRef = useRef<{ x: number; y: number } | null>(null);
  const { onCropFirstHandled } = props;

  useEffect(() => {
    if (props.cropFirst) onCropFirstHandled?.();
  }, [props.cropFirst, onCropFirstHandled]);

  // Filter thumbnails for the current page while the filter panel is open.
  const previewKey = page && panel === 'filters' ? `${page.id}:${page.rotation}:${page.parts.map(p => p.quad.map(c => `${c.x.toFixed(3)},${c.y.toFixed(3)}`).join(';')).join('|')}` : '';
  useEffect(() => {
    if (!previewKey || !page) return;
    let cancelled = false;
    const made: string[] = [];
    void (async () => {
      for (const f of FILTERS) {
        try {
          const url = await renderFilterPreview(page, f.value);
          if (cancelled) { URL.revokeObjectURL(url); return; }
          made.push(url);
          setPreviews(prev => ({ ...prev, [f.value]: url }));
        } catch { /* leave that tile blank */ }
      }
    })();
    return () => {
      cancelled = true;
      made.forEach(u => URL.revokeObjectURL(u));
      setPreviews({});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- previewKey captures what matters about `page`
  }, [previewKey]);

  if (!page) return null;

  const go = (d: number) => {
    setZoom({ s: 1, x: 0, y: 0 });
    onIndex(Math.max(0, Math.min(pages.length - 1, index + d)));
  };

  /* Preview gestures: swipe (not zoomed), pinch to zoom, drag to pan, double-tap to toggle zoom. */
  const onPreviewDown = (e: React.PointerEvent) => {
    // The previous/next arrows sit inside the preview; let them get their click.
    if ((e.target as HTMLElement).closest('button')) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    const pts = [...pointers.current.values()];
    if (pts.length === 2) {
      gesture.current = { dist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y), s: zoom.s, x: zoom.x, y: zoom.y, px: 0, py: 0 };
    } else if (pts.length === 1) {
      gesture.current = { dist: 0, s: zoom.s, x: zoom.x, y: zoom.y, px: e.clientX, py: e.clientY };
      swipeRef.current = { x: e.clientX, y: e.clientY };
    }
  };
  const onPreviewMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId) || !gesture.current) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = [...pointers.current.values()];
    const g = gesture.current;
    if (pts.length === 2 && g.dist > 0) {
      const s = Math.min(4, Math.max(1, (g.s * Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)) / g.dist));
      setZoom(z => (s === 1 ? { s: 1, x: 0, y: 0 } : { ...z, s }));
    } else if (pts.length === 1 && g.s > 1) {
      setZoom({ s: g.s, x: g.x + (e.clientX - g.px), y: g.y + (e.clientY - g.py) });
    }
  };
  const onPreviewUp = (e: React.PointerEvent) => {
    const wasPinch = pointers.current.size > 1;
    pointers.current.delete(e.pointerId);
    if (pointers.current.size > 0) return;
    gesture.current = null;
    const s = swipeRef.current;
    swipeRef.current = null;
    if (wasPinch || !s) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
      const now = performance.now();
      if (now - lastTap.current < 300) {
        lastTap.current = 0;
        setZoom(z => (z.s > 1 ? { s: 1, x: 0, y: 0 } : { s: 2.5, x: 0, y: 0 }));
      } else lastTap.current = now;
      return;
    }
    if (zoom.s === 1 && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
  };

  /* Reorder by dragging the grip on a thumbnail. */
  const onGripMove = (e: React.PointerEvent) => {
    if (dragFrom === null) return;
    const el = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-page-index]');
    const to = el ? Number(el.getAttribute('data-page-index')) : NaN;
    if (Number.isInteger(to) && to !== dragFrom) {
      onMove(dragFrom, to);
      setDragFrom(to);
      setSelected(to);
    }
  };

  const tool = (label: string, icon: React.ReactNode, onClick: () => void, opts: { active?: boolean; danger?: boolean } = {}) => (
    <button
      key={label}
      onClick={onClick}
      className={`flex flex-col items-center gap-1 min-w-[3.6rem] px-1 py-1.5 rounded-xl text-[10px] font-semibold transition-colors ${opts.active ? 'bg-white/15 text-white' : opts.danger ? 'text-red-300' : 'text-white/85'}`}
    >
      {icon}
      {label}
    </button>
  );

  const togglePanel = (p: Panel) => setPanel(cur => (cur === p ? null : p));

  return (
    <div className="fixed inset-0 z-[75] flex flex-col bg-gray-950 text-white" style={{ height: '100dvh' }}>
      {/* Header */}
      <div className="flex items-center gap-2 px-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-2">
        <button onClick={onBack} className="p-2.5 rounded-full hover:bg-white/10" aria-label="Back"><ArrowLeft className="w-5 h-5" /></button>
        <div className="flex-1 min-w-0">
          {renaming ? (
            <input
              autoFocus
              value={docName}
              onChange={e => onDocName(e.target.value)}
              onBlur={() => setRenaming(false)}
              onKeyDown={e => { if (e.key === 'Enter') setRenaming(false); }}
              className="w-full bg-white/10 rounded-lg px-2 py-1.5 text-sm outline-none"
              aria-label="Document name"
            />
          ) : (
            <button onClick={() => setRenaming(true)} className="flex items-center gap-1.5 max-w-full text-sm font-semibold">
              <span className="truncate">{docName}</span><Pencil className="w-3.5 h-3.5 shrink-0 text-white/60" />
            </button>
          )}
          <p className="text-[11px] text-white/60">Page {index + 1} of {pages.length}</p>
        </div>
        <button onClick={onUndo} disabled={!canUndo} className="p-2.5 rounded-full hover:bg-white/10 disabled:opacity-30" aria-label="Undo last change"><Undo2 className="w-5 h-5" /></button>
        <button onClick={() => togglePanel('save')} className="px-4 py-2 rounded-xl bg-violet-600 font-semibold text-sm">Save PDF</button>
      </div>

      {/* Page preview — swipe left/right */}
      <div
        className="relative flex-1 min-h-0 flex items-center justify-center px-10 overflow-hidden"
        onPointerDown={onPreviewDown}
        onPointerMove={onPreviewMove}
        onPointerUp={onPreviewUp}
        onPointerCancel={onPreviewUp}
        style={{ touchAction: 'none' }}
      >
        {page.url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={page.url}
            alt={`Page ${index + 1}`}
            draggable={false}
            className="max-h-full max-w-full rounded-md shadow-2xl object-contain bg-white select-none"
            style={{ transform: `translate(${zoom.x}px, ${zoom.y}px) scale(${zoom.s})`, transition: 'transform 60ms linear' }}
          />
        ) : (
          <Loader2 className="w-8 h-8 animate-spin" />
        )}
        {index > 0 && <button onClick={() => go(-1)} className="absolute left-1 p-2 rounded-full bg-white/10" aria-label="Previous page"><ChevronLeft className="w-5 h-5" /></button>}
        {index < pages.length - 1 && <button onClick={() => go(1)} className="absolute right-1 p-2 rounded-full bg-white/10" aria-label="Next page"><ChevronRight className="w-5 h-5" /></button>}
      </div>

      {/* Panels */}
      {panel === 'filters' && (
        <div className="px-3 pt-3">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {FILTERS.map(f => (
              <button key={f.value} onClick={() => onUpdate(page.id, { filter: f.value })} className="shrink-0 w-[4.6rem] text-center">
                <span className={`block h-20 rounded-lg overflow-hidden bg-white/10 ring-2 ${page.filter === f.value ? 'ring-violet-500' : 'ring-transparent'}`}>
                  {previews[f.value] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={previews[f.value]} alt="" className="w-full h-full object-cover" />
                  ) : <Loader2 className="w-4 h-4 animate-spin mx-auto mt-8 text-white/50" />}
                </span>
                <span className={`block mt-1 text-[11px] font-semibold ${page.filter === f.value ? 'text-violet-300' : 'text-white/80'}`}>{f.label}</span>
              </button>
            ))}
          </div>
          {pages.length > 1 && <button onClick={() => onFilterAll(page.filter)} className="w-full py-2 rounded-lg bg-white/10 text-xs font-semibold">Apply this filter to all {pages.length} pages</button>}
        </div>
      )}

      {panel === 'adjust' && (
        <div className="px-6 pt-3 space-y-3 max-w-md w-full mx-auto">
          {(['brightness', 'contrast'] as const).map(k => (
            <label key={k} className="flex items-center gap-3 text-xs font-semibold capitalize">
              <span className="w-20">{k}</span>
              <input type="range" min={-60} max={60} step={5} value={page[k]} onChange={e => onUpdate(page.id, { [k]: Number(e.target.value) })} className="flex-1 accent-violet-500" />
              <span className="w-8 text-right tabular-nums text-white/70">{page[k]}</span>
            </label>
          ))}
          <button onClick={() => onUpdate(page.id, { brightness: 0, contrast: 0 })} className="text-xs text-white/70 underline">Reset</button>
        </div>
      )}

      {panel === 'reorder' && (
        <div
          className="px-3 pt-3 max-h-[45vh] overflow-y-auto"
          onPointerMove={onGripMove}
          onPointerUp={() => setDragFrom(null)}
          onPointerCancel={() => setDragFrom(null)}
          style={dragFrom !== null ? { touchAction: 'none' } : undefined}
        >
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {pages.map((p, i) => (
              <div key={p.id} data-page-index={i} className={`relative aspect-[3/4] rounded-md overflow-hidden bg-white/10 ring-2 ${dragFrom === i ? 'ring-violet-400 opacity-70' : selected === i ? 'ring-violet-500' : i === index ? 'ring-white/40' : 'ring-transparent'}`}>
                <button onClick={() => setSelected(s => (s === i ? null : i))} className="absolute inset-0" aria-label={`Select page ${i + 1}`}>
                  {p.url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.url} alt={`Page ${i + 1}`} className="w-full h-full object-cover" draggable={false} />
                  )}
                </button>
                <span className="absolute bottom-0.5 left-0.5 px-1 rounded bg-black/70 text-[10px] font-bold pointer-events-none">{i + 1}</span>
                <span
                  role="button"
                  aria-label={`Drag page ${i + 1} to reorder`}
                  className="absolute top-0 right-0 w-8 h-8 flex items-center justify-center bg-black/55 rounded-bl-md cursor-grab"
                  style={{ touchAction: 'none' }}
                  onPointerDown={e => { (e.currentTarget as Element).releasePointerCapture?.(e.pointerId); setDragFrom(i); setSelected(i); }}
                >
                  <GripVertical className="w-4 h-4" />
                </span>
              </div>
            ))}
          </div>
          <div className="flex gap-2 py-3">
            {selected === null ? <p className="text-xs text-white/60">Drag a page by its handle, or tap it and use the buttons.</p> : (
              <>
                <button onClick={() => { onMove(selected, 0); setSelected(0); }} disabled={selected === 0} className="flex-1 py-2 rounded-lg bg-white/10 text-xs font-semibold disabled:opacity-30">First</button>
                <button onClick={() => { onMove(selected, selected - 1); setSelected(selected - 1); }} disabled={selected === 0} className="flex-1 py-2 rounded-lg bg-white/10 text-xs font-semibold disabled:opacity-30">◀ Earlier</button>
                <button onClick={() => { onMove(selected, selected + 1); setSelected(selected + 1); }} disabled={selected === pages.length - 1} className="flex-1 py-2 rounded-lg bg-white/10 text-xs font-semibold disabled:opacity-30">Later ▶</button>
                <button onClick={() => { onMove(selected, pages.length - 1); setSelected(pages.length - 1); }} disabled={selected === pages.length - 1} className="flex-1 py-2 rounded-lg bg-white/10 text-xs font-semibold disabled:opacity-30">Last</button>
              </>
            )}
          </div>
        </div>
      )}

      {panel === 'delete' && (
        <div className="px-4 pt-3 flex items-center justify-center gap-3">
          <p className="text-sm">Delete page {index + 1}?</p>
          <button onClick={() => { setPanel(null); onDelete(page.id); }} className="px-4 py-2 rounded-lg bg-red-600 text-sm font-semibold">Delete</button>
          <button onClick={() => setPanel(null)} className="px-4 py-2 rounded-lg bg-white/10 text-sm font-semibold">Keep</button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex gap-1 overflow-x-auto px-2 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] justify-start sm:justify-center">
        {tool('Add', <Camera className="w-5 h-5" />, onAddMore)}
        {tool('Retake', <ScanLine className="w-5 h-5" />, () => onRetake(page.id))}
        {tool('Crop', <Crop className="w-5 h-5" />, () => { setCropPart(0); setEditor('crop'); })}
        {tool('Rotate', <RotateCw className="w-5 h-5" />, () => onUpdate(page.id, { rotation: (page.rotation + 90) % 360 }))}
        {tool('Filters', <Palette className="w-5 h-5" />, () => togglePanel('filters'), { active: panel === 'filters' })}
        {tool('Adjust', <SlidersHorizontal className="w-5 h-5" />, () => togglePanel('adjust'), { active: panel === 'adjust' })}
        {tool('Markup', <PenLine className="w-5 h-5" />, () => setEditor('markup'))}
        {tool('Cleanup', <Eraser className="w-5 h-5" />, () => setEditor('cleanup'))}
        {tool('Copy text', <ScanText className="w-5 h-5" />, () => openOcr('text'))}
        {page.layout === 'card' && tool('Contact', <Contact className="w-5 h-5" />, () => openOcr('contact'))}
        {tool('Reorder', <LayoutGrid className="w-5 h-5" />, () => { setSelected(index); togglePanel('reorder'); }, { active: panel === 'reorder' })}
        {tool('Revert', <History className="w-5 h-5" />, () => onRevert(page.id))}
        {tool('Delete', <Trash2 className="w-5 h-5" />, () => togglePanel('delete'), { danger: true })}
      </div>

      {/* Save sheet */}
      {panel === 'save' && (
        <div className="absolute inset-0 z-20 flex flex-col justify-end bg-black/60" onClick={() => setPanel(null)}>
          <div className="max-h-[92dvh] overflow-y-auto rounded-t-3xl bg-gray-900 px-5 pt-4 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-base font-bold">Save as PDF</p>
              <button onClick={() => setPanel(null)} className="p-2 rounded-full hover:bg-white/10" aria-label="Close"><X className="w-5 h-5" /></button>
            </div>
            <ExportPanel pages={pages} docName={docName} onDocName={onDocName} dark onScanNew={onScanNew} />
          </div>
        </div>
      )}

      {editor === 'crop' && (
        <CropEditor
          key={`${page.id}-${cropPart}`}
          source={page.parts[cropPart].source}
          quad={page.parts[cropPart].quad}
          tabs={page.parts.length > 1 ? page.parts.map((_, i) => ({ label: i === 0 ? 'Front' : 'Back', active: i === cropPart, onSelect: () => setCropPart(i) })) : undefined}
          onCancel={() => setEditor(null)}
          onDone={quad => {
            const parts = page.parts.map((p, i) => (i === cropPart ? { ...p, quad } : p));
            // Cleanup marks were placed on the old crop; they would land in the wrong spot.
            onUpdate(page.id, { parts, strokes: [] });
            setEditor(null);
          }}
        />
      )}

      {editor === 'markup' && (
        <MarkupEditor
          page={page}
          onCancel={() => setEditor(null)}
          onDone={marks => { onUpdate(page.id, { marks }); setEditor(null); }}
        />
      )}

      {(editor === 'text' || editor === 'contact') && (
        ocrImage && ocrImage.id === page.id ? (
          editor === 'text'
            ? <TextSheet image={ocrImage.blob} onClose={() => setEditor(null)} />
            : <ContactSheet image={ocrImage.blob} onClose={() => setEditor(null)} />
        ) : (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-gray-950"><Loader2 className="w-8 h-8 animate-spin" /></div>
        )
      )}

      {editor === 'cleanup' && (
        <CleanupEditor
          page={page}
          onCancel={() => setEditor(null)}
          onDone={strokes => { onUpdate(page.id, { strokes }); setEditor(null); }}
        />
      )}
    </div>
  );
}
