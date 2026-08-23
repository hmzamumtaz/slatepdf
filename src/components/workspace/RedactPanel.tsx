'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Trash2, Undo2, MousePointerSquareDashed } from 'lucide-react';
import { renderPdfPreviews, redactPdf, type PagePreview } from '@/lib/pdf-engine';
import { PanelHeader, ApplyButton, Loading, type PanelProps } from './shared';

/** A drawn box, stored in PDF points with a bottom-left origin. */
interface Box { pageIndex: number; x: number; y: number; width: number; height: number }

const MIN_BOX_PX = 4;

/**
 * Draw over what should go. The words underneath are removed from the file,
 * not covered — the same routine the standalone tool uses.
 */
export default function RedactPanel({ file, busy, apply }: PanelProps) {
  const [previews, setPreviews] = useState<PagePreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState('');
  const [current, setCurrent] = useState(0);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [drag, setDrag] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const surface = useRef<HTMLDivElement>(null);

  const page = previews[current];
  const pageBoxes = boxes.filter(b => b.pageIndex === current);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setBoxes([]);
      try {
        const rendered = await renderPdfPreviews(file, { scale: 2 }, (p, t) => {
          if (!cancelled) setProgress(`Rendering page ${p} of ${t}…`);
        });
        if (!cancelled) {
          setPreviews(rendered);
          setCurrent(c => Math.min(c, rendered.length - 1));
        }
      } finally {
        if (!cancelled) { setLoading(false); setProgress(''); }
      }
    })();
    return () => { cancelled = true; };
  }, [file]);

  const relative = (e: React.PointerEvent) => {
    const rect = surface.current!.getBoundingClientRect();
    return {
      x: Math.min(Math.max(e.clientX - rect.left, 0), rect.width),
      y: Math.min(Math.max(e.clientY - rect.top, 0), rect.height),
    };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!page || busy) return;
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
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo]);

  const run = () => apply(
    () => redactPdf(file, boxes),
    `Redacted ${boxes.length} area${boxes.length === 1 ? '' : 's'}`,
  );

  return (
    <>
      <PanelHeader
        title="Redact"
        hint="Drag over anything that should go. The text underneath is removed from the file, not painted over."
        action={
          <div className="flex items-center gap-2">
            {boxes.length > 0 && (
              <>
                <button onClick={undo} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium border border-border hover:bg-muted transition-colors">
                  <Undo2 className="w-3 h-3" /> Undo box
                </button>
                <button onClick={() => setBoxes([])} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium border border-border hover:bg-muted transition-colors">
                  <Trash2 className="w-3 h-3" /> Clear
                </button>
              </>
            )}
            <ApplyButton onClick={run} disabled={boxes.length === 0} busy={busy}>
              Redact {boxes.length || ''}
            </ApplyButton>
          </div>
        }
      />

      {previews.length > 1 && (
        <div className="flex items-center justify-center gap-2 py-2 border-b border-border shrink-0">
          <button
            onClick={() => setCurrent(c => Math.max(0, c - 1))}
            disabled={current === 0}
            className="w-7 h-7 rounded-md border border-border flex items-center justify-center hover:bg-muted disabled:opacity-40 transition-colors"
            aria-label="Previous page"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="text-xs text-muted-foreground tabular-nums">
            Page {current + 1} of {previews.length}
            {pageBoxes.length > 0 && ` · ${pageBoxes.length} marked`}
          </span>
          <button
            onClick={() => setCurrent(c => Math.min(previews.length - 1, c + 1))}
            disabled={current >= previews.length - 1}
            className="w-7 h-7 rounded-md border border-border flex items-center justify-center hover:bg-muted disabled:opacity-40 transition-colors"
            aria-label="Next page"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-auto bg-gray-200/70 p-6">
        {loading ? (
          <Loading message={progress || 'Rendering the document…'} />
        ) : page ? (
          <div className="flex flex-col items-center gap-3">
            <div
              ref={surface}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              className="relative inline-block shadow-xl cursor-crosshair select-none touch-none max-w-full"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={page.url} alt={`Page ${current + 1}`} draggable={false} className="block max-w-full h-auto" />

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

            <p className="inline-flex items-center gap-2 text-xs text-muted-foreground text-center max-w-lg">
              <MousePointerSquareDashed className="w-3.5 h-3.5 shrink-0" />
              {boxes.length === 0
                ? 'Drag across the page to mark something for removal.'
                : 'Redacted pages become pictures with the marked text gone for good — do the text editing first.'}
            </p>
          </div>
        ) : null}
      </div>
    </>
  );
}
