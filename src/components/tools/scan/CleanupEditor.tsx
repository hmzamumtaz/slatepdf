'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Loader2, Undo2, X } from 'lucide-react';
import { applyCleanup, samplePaperColor, type CleanupStroke, type Corner } from '@/lib/document-scanner';
import { renderPageCanvas, unrotatePoint, type ScanPage } from '@/lib/scan-session';

interface Props {
  page: ScanPage;
  onCancel: () => void;
  onDone: (strokes: CleanupStroke[]) => void;
}

/**
 * Brush away marks, stains, punch holes or fingers on a page. Each stroke
 * paints with the paper colour sampled where it starts, so it blends in.
 */
export default function CleanupEditor({ page, onCancel, onDone }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const baseRef = useRef<HTMLCanvasElement | null>(null);
  const strokesRef = useRef<CleanupStroke[]>([]);
  const currentRef = useRef<CleanupStroke | null>(null);
  const [count, setCount] = useState(0);
  const [size, setSize] = useState(0.02);
  const [ready, setReady] = useState(false);

  /** Base = the page as it currently looks, rotated, without the new strokes. */
  const redraw = useCallback(() => {
    const view = canvasRef.current;
    const base = baseRef.current;
    if (!view || !base) return;
    const ctx = view.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(base, 0, 0);
    applyCleanup(view, [...strokesRef.current, ...(currentRef.current ? [currentRef.current] : [])]);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void renderPageCanvas(page, 1600).then(c => {
      if (cancelled || !canvasRef.current) return;
      baseRef.current = c;
      canvasRef.current.width = c.width;
      canvasRef.current.height = c.height;
      redraw();
      setReady(true);
    });
    return () => { cancelled = true; };
  }, [page, redraw]);

  const pointFrom = (e: React.PointerEvent): Corner | null => {
    const el = canvasRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
  };

  const onDown = (e: React.PointerEvent) => {
    const p = pointFrom(e);
    const base = baseRef.current;
    if (!p || !base) return;
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    currentRef.current = { points: [p], radius: size, color: samplePaperColor(base, p.x, p.y) };
    redraw();
  };

  const onMove = (e: React.PointerEvent) => {
    if (!currentRef.current) return;
    const p = pointFrom(e);
    if (!p) return;
    currentRef.current.points.push(p);
    redraw();
  };

  const onUp = () => {
    if (!currentRef.current) return;
    strokesRef.current = [...strokesRef.current, currentRef.current];
    currentRef.current = null;
    setCount(strokesRef.current.length);
  };

  const undo = () => {
    strokesRef.current = strokesRef.current.slice(0, -1);
    setCount(strokesRef.current.length);
    redraw();
  };

  const finish = () => {
    // Store strokes in the page's pre-rotation coordinates.
    const mapped = strokesRef.current.map(s => ({ ...s, points: s.points.map(p => unrotatePoint(p, page.rotation)) }));
    onDone([...page.strokes, ...mapped]);
  };

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-gray-950 text-white">
      <div className="flex items-center justify-between px-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-2">
        <button onClick={onCancel} className="p-2.5 rounded-full hover:bg-white/10" aria-label="Cancel cleanup"><X className="w-6 h-6" /></button>
        <p className="text-sm font-semibold">Cleanup</p>
        <button onClick={finish} className="px-4 py-2 rounded-xl bg-violet-600 font-semibold text-sm flex items-center gap-1.5">
          <Check className="w-4 h-4" /> Done
        </button>
      </div>
      <div className="relative flex-1 min-h-0 flex items-center justify-center px-4">
        {!ready && <Loader2 className="absolute w-8 h-8 animate-spin" />}
        <canvas
          ref={canvasRef}
          className="max-w-full max-h-full rounded-lg shadow-2xl"
          style={{ touchAction: 'none', visibility: ready ? 'visible' : 'hidden' }}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        />
      </div>
      <p className="text-center text-xs text-white/70 px-6 pt-3">Paint over marks, stains or fingers to erase them.</p>
      <div className="flex items-center gap-4 px-6 pt-3 pb-[calc(env(safe-area-inset-bottom)+1rem)] max-w-md w-full mx-auto">
        <label className="flex-1 flex items-center gap-3 text-xs font-semibold">
          Brush
          <input type="range" min={0.006} max={0.06} step={0.002} value={size} onChange={e => setSize(Number(e.target.value))} className="flex-1 accent-violet-500" aria-label="Brush size" />
        </label>
        <button onClick={undo} disabled={count === 0} className="px-4 py-2.5 rounded-xl bg-white/10 text-sm font-semibold flex items-center gap-1.5 disabled:opacity-40">
          <Undo2 className="w-4 h-4" /> Undo
        </button>
      </div>
    </div>
  );
}
