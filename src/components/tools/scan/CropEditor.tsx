'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Loader2, Maximize, ScanSearch, X } from 'lucide-react';
import { detectDocumentCornersInImage, refineCorners, type Corner } from '@/lib/document-scanner';
import { blobToCanvas, FULL_QUAD } from '@/lib/scan-session';

interface Props {
  source: Blob;
  quad: Corner[];
  title?: string;
  /** Optional tabs, e.g. Front / Back for an ID card. */
  tabs?: { label: string; active: boolean; onSelect: () => void }[];
  onCancel: () => void;
  onDone: (quad: Corner[]) => void;
}

const LOUPE = 112;
const ZOOM = 2.5;

function isConvex(q: Corner[]): boolean {
  let sign = 0;
  for (let i = 0; i < 4; i++) {
    const a = q[i];
    const b = q[(i + 1) % 4];
    const c = q[(i + 2) % 4];
    const cr = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
    const s = Math.sign(cr);
    if (s === 0) return false;
    if (sign !== 0 && s !== sign) return false;
    sign = s;
  }
  return true;
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/**
 * Adjust a page's borders: drag the four corners (or the middle of an edge to
 * move a whole side). A magnifier shows the exact spot under your finger.
 */
export default function CropEditor({ source, quad, title = 'Adjust borders', tabs, onCancel, onDone }: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [box, setBox] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [pts, setPts] = useState<Corner[]>(quad);
  const [drag, setDrag] = useState<{ kind: 'corner' | 'edge'; index: number } | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const u = URL.createObjectURL(source);
    const img = new Image();
    img.onload = () => {
      setNatural({ w: img.naturalWidth, h: img.naturalHeight });
      setUrl(u);
    };
    img.src = u;
    return () => URL.revokeObjectURL(u);
  }, [source]);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBox({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Where the image actually sits inside the box (object-contain).
  const fit = (() => {
    if (!natural || !box.w || !box.h) return null;
    const s = Math.min(box.w / natural.w, box.h / natural.h);
    const w = natural.w * s;
    const h = natural.h * s;
    return { x: (box.w - w) / 2, y: (box.h - h) / 2, w, h };
  })();

  const toNorm = useCallback((clientX: number, clientY: number): Corner | null => {
    const el = boxRef.current;
    if (!el || !fit) return null;
    const r = el.getBoundingClientRect();
    return { x: clamp01((clientX - r.left - fit.x) / fit.w), y: clamp01((clientY - r.top - fit.y) / fit.h) };
  }, [fit]);

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag) return;
    const p = toNorm(e.clientX, e.clientY);
    if (!p) return;
    setPts(prev => {
      const next = prev.slice();
      if (drag.kind === 'corner') {
        next[drag.index] = p;
      } else {
        // Move both corners of this edge by the same amount.
        const a = drag.index;
        const b = (drag.index + 1) % 4;
        const mid = { x: (prev[a].x + prev[b].x) / 2, y: (prev[a].y + prev[b].y) / 2 };
        const dx = p.x - mid.x;
        const dy = p.y - mid.y;
        next[a] = { x: clamp01(prev[a].x + dx), y: clamp01(prev[a].y + dy) };
        next[b] = { x: clamp01(prev[b].x + dx), y: clamp01(prev[b].y + dy) };
      }
      return next;
    });
  };

  const startDrag = (kind: 'corner' | 'edge', index: number) => (e: React.PointerEvent) => {
    e.preventDefault();
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    setDrag({ kind, index });
  };

  const autoDetect = async () => {
    setDetecting(true);
    setNotFound(false);
    try {
      const canvas = await blobToCanvas(source);
      const found = detectDocumentCornersInImage(canvas);
      if (found) setPts(refineCorners(canvas, found));
      else setNotFound(true);
    } finally {
      setDetecting(false);
    }
  };

  const valid = isConvex(pts);
  const px = (c: Corner) => (fit ? { x: fit.x + c.x * fit.w, y: fit.y + c.y * fit.h } : { x: 0, y: 0 });
  const active = drag ? (drag.kind === 'corner' ? pts[drag.index] : {
    x: (pts[drag.index].x + pts[(drag.index + 1) % 4].x) / 2,
    y: (pts[drag.index].y + pts[(drag.index + 1) % 4].y) / 2,
  }) : null;
  const activePx = active ? px(active) : null;

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-gray-950 text-white">
      <div className="flex items-center justify-between px-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-2">
        <button onClick={onCancel} className="p-2.5 rounded-full hover:bg-white/10" aria-label="Cancel crop"><X className="w-6 h-6" /></button>
        <p className="text-sm font-semibold">{title}</p>
        <button
          onClick={() => valid && onDone(pts)}
          disabled={!valid}
          className="px-4 py-2 rounded-xl bg-violet-600 font-semibold text-sm flex items-center gap-1.5 disabled:opacity-40"
        >
          <Check className="w-4 h-4" /> Done
        </button>
      </div>

      {tabs && (
        <div className="flex justify-center gap-1.5 pb-2">
          {tabs.map(t => (
            <button key={t.label} onClick={t.onSelect} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${t.active ? 'bg-white text-gray-900' : 'bg-white/10 text-white/80'}`}>{t.label}</button>
          ))}
        </div>
      )}

      <div
        ref={boxRef}
        className="relative flex-1 min-h-0 mx-4 select-none"
        style={{ touchAction: 'none' }}
        onPointerMove={onPointerMove}
        onPointerUp={() => setDrag(null)}
        onPointerCancel={() => setDrag(null)}
      >
        {url && fit ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="Page photo" draggable={false} className="absolute pointer-events-none" style={{ left: fit.x, top: fit.y, width: fit.w, height: fit.h }} />
            <svg className="absolute inset-0 w-full h-full" width={box.w} height={box.h}>
              <defs>
                <mask id="crop-mask">
                  <rect width="100%" height="100%" fill="white" />
                  <polygon points={pts.map(c => { const p = px(c); return `${p.x},${p.y}`; }).join(' ')} fill="black" />
                </mask>
              </defs>
              <rect width="100%" height="100%" fill="rgba(0,0,0,0.5)" mask="url(#crop-mask)" />
              <polygon
                points={pts.map(c => { const p = px(c); return `${p.x},${p.y}`; }).join(' ')}
                fill="none"
                stroke={valid ? '#8b5cf6' : '#ef4444'}
                strokeWidth={2.5}
              />
              {pts.map((c, i) => {
                const a = px(c);
                const b = px(pts[(i + 1) % 4]);
                return (
                  <g key={`e${i}`} onPointerDown={startDrag('edge', i)} style={{ cursor: 'move' }}>
                    <circle cx={(a.x + b.x) / 2} cy={(a.y + b.y) / 2} r={22} fill="transparent" />
                    <rect x={(a.x + b.x) / 2 - 9} y={(a.y + b.y) / 2 - 9} width={18} height={18} rx={4} fill="#fff" stroke="#8b5cf6" strokeWidth={2} />
                  </g>
                );
              })}
              {pts.map((c, i) => {
                const p = px(c);
                return (
                  <g key={`c${i}`} onPointerDown={startDrag('corner', i)} style={{ cursor: 'grab' }}>
                    <circle cx={p.x} cy={p.y} r={26} fill="transparent" />
                    <circle cx={p.x} cy={p.y} r={11} fill="rgba(139,92,246,0.35)" stroke="#fff" strokeWidth={2.5} />
                  </g>
                );
              })}
            </svg>

            {/* Magnifier: sits in the corner away from the finger. */}
            {activePx && fit && url && (
              <div
                className="absolute rounded-full border-4 border-white shadow-2xl overflow-hidden pointer-events-none"
                style={{
                  width: LOUPE, height: LOUPE,
                  left: activePx.x < box.w / 2 ? box.w - LOUPE - 8 : 8,
                  top: 8,
                  backgroundImage: `url(${url})`,
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: `${fit.w * ZOOM}px ${fit.h * ZOOM}px`,
                  backgroundPosition: `${LOUPE / 2 - (activePx.x - fit.x) * ZOOM}px ${LOUPE / 2 - (activePx.y - fit.y) * ZOOM}px`,
                }}
              >
                <div className="absolute left-1/2 top-1/2 w-4 h-4 -ml-2 -mt-2 border-2 border-violet-500 rounded-full" />
              </div>
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" /></div>
        )}
      </div>

      <p className="text-center text-xs text-white/70 px-6 pt-3 min-h-[1.5rem]">
        {!valid ? 'The corners cross over — drag them back into a four-sided shape.'
          : notFound ? 'No page edges found in this photo. Drag the corners yourself.'
            : 'Drag the corners or edges to the edge of the page.'}
      </p>
      <div className="flex justify-center gap-3 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
        <button onClick={autoDetect} disabled={detecting} className="flex-1 max-w-[11rem] px-4 py-3 rounded-xl bg-white/10 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
          {detecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanSearch className="w-4 h-4" />} Auto-detect
        </button>
        <button onClick={() => { setPts(FULL_QUAD); setNotFound(false); }} className="flex-1 max-w-[11rem] px-4 py-3 rounded-xl bg-white/10 text-sm font-semibold flex items-center justify-center gap-2">
          <Maximize className="w-4 h-4" /> Full photo
        </button>
      </div>
    </div>
  );
}
