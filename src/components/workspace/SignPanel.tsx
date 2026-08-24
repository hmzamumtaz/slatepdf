'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Dancing_Script } from 'next/font/google';
import { ChevronLeft, ChevronRight, PenLine, Type as TypeIcon, Eraser, MoveDiagonal } from 'lucide-react';
import { renderPdfPreviews, type PagePreview } from '@/lib/pdf-engine';
import { friendlyError } from '@/lib/errors';
import { trimCanvas, renderTextSignature } from '@/lib/signature-render';
import { stampImage } from '@/lib/workspace';
import { PanelHeader, ApplyButton, Loading, inputClass, type PanelProps } from './shared';

/** The handwriting face a typed name is turned into when the user asks for it. */
const handwriting = Dancing_Script({ weight: '600', subsets: ['latin'], display: 'swap' });

const TYPED_FONT = 'Georgia, "Times New Roman", serif';
const INK = '#111827';

type Kind = 'draw' | 'type';

/**
 * Sign where you want to sign.
 *
 * Drawn and typed signatures both become the same transparent PNG, so the
 * stamp in the document is the pixels shown in the preview — and it is placed
 * by dragging it, not by guessing where whitespace is.
 */
export default function SignPanel({ file, busy, apply }: PanelProps) {
  const [previews, setPreviews] = useState<PagePreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(0);

  const [kind, setKind] = useState<Kind>('draw');
  const [name, setName] = useState('');
  const [handwritten, setHandwritten] = useState<boolean | null>(null);
  const [stamp, setStamp] = useState<{ url: string; aspect: number } | null>(null);
  /** Only set once the signature has been moved — until then the default stands. */
  const [moved, setMoved] = useState<{ x: number; y: number; width: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const hasDrawn = useRef(false);
  const surface = useRef<HTMLDivElement>(null);
  const drag = useRef<{ kind: 'move' | 'resize'; x: number; y: number; box: { x: number; y: number; width: number } } | null>(null);

  const page = previews[current];

  // Where the signature sits. Deriving the default rather than storing it means
  // the signature is always placed, even if it was built before the page had
  // finished rendering — there is no state in which it exists but has nowhere
  // to go.
  const box = !stamp || !page
    ? null
    : moved ?? {
      width: Math.min(180, page.pointWidth * 0.35),
      x: page.pointWidth - Math.min(180, page.pointWidth * 0.35) - 48,
      y: 56,
    };
  const height = stamp && box ? box.width / stamp.aspect : 0;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const rendered = await renderPdfPreviews(file, { scale: 1.6 });
        if (cancelled) return;
        setPreviews(rendered);
        setCurrent(c => Math.min(c, rendered.length - 1));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [file]);

  // --- drawing pad ---------------------------------------------------------
  const padPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const padDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const ctx = canvasRef.current!.getContext('2d')!;
    const p = padPoint(e);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    drawing.current = true;
    hasDrawn.current = true;
  };

  const padMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current!.getContext('2d')!;
    const p = padPoint(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  };

  const padUp = () => { drawing.current = false; };

  const clearPad = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height);
    hasDrawn.current = false;
    setStamp(null);
    setMoved(null);
  };

  // --- building the stamp --------------------------------------------------
  const build = useCallback(async () => {
    setError(null);
    try {
      let canvas: HTMLCanvasElement | null;
      if (kind === 'draw') {
        if (!canvasRef.current || !hasDrawn.current) throw new Error('Draw your signature first.');
        canvas = trimCanvas(canvasRef.current, 6);
      } else {
        if (!name.trim()) throw new Error('Type your name first.');
        if (handwritten === null) throw new Error('Choose whether it should be handwritten.');
        canvas = await renderTextSignature(name, {
          fontFamily: handwritten ? handwriting.style.fontFamily : TYPED_FONT,
          color: INK,
        });
      }
      if (!canvas || canvas.width === 0) throw new Error('There is nothing to place yet.');

      setStamp({ url: canvas.toDataURL('image/png'), aspect: canvas.width / canvas.height });
      setMoved(null);
    } catch (err) {
      setError(friendlyError(err));
    }
  }, [kind, name, handwritten]);

  // --- placing it ----------------------------------------------------------
  const startDrag = (e: React.PointerEvent, mode: 'move' | 'resize') => {
    if (!box) return;
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { kind: mode, x: e.clientX, y: e.clientY, box: { ...box } };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const active = drag.current;
    if (!active || !page || !surface.current) return;
    const rect = surface.current.getBoundingClientRect();
    const dx = ((e.clientX - active.x) / rect.width) * page.pointWidth;
    const dy = ((e.clientY - active.y) / rect.height) * page.pointHeight;

    if (active.kind === 'move') {
      setMoved({ ...active.box, x: active.box.x + dx, y: active.box.y - dy });
    } else {
      setMoved({ ...active.box, width: Math.max(24, active.box.width + dx) });
    }
  };

  const onPointerUp = () => { drag.current = null; };

  const placeAt = (e: React.MouseEvent) => {
    if (!stamp || !page || !box || !surface.current || drag.current) return;
    const rect = surface.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * page.pointWidth - box.width / 2;
    const y = page.pointHeight - ((e.clientY - rect.top) / rect.height) * page.pointHeight - (box.width / stamp.aspect) / 2;
    setMoved({ x, y, width: box.width });
  };

  const run = async () => {
    if (!stamp || !box || !page) return;
    setError(null);
    const png = new Uint8Array(await (await fetch(stamp.url)).arrayBuffer());
    await apply(
      () => stampImage(file, png, {
        pageIndex: current,
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.width / stamp.aspect,
      }),
      `Signed page ${current + 1}`,
    );
    clearPad();
  };

  return (
    <>
      <PanelHeader
        title="Sign"
        hint="Draw or type a signature, then drag it where it belongs."
        action={
          <ApplyButton onClick={run} disabled={!stamp || !box} busy={busy}>
            Place signature
          </ApplyButton>
        }
      />

      <div className="flex-1 min-h-0 grid lg:grid-cols-[22rem_1fr] overflow-hidden">
        {/* Make the signature */}
        <div className="border-b lg:border-b-0 lg:border-r border-border p-4 space-y-3 overflow-y-auto">
          <div className="flex gap-1.5">
            {([['draw', 'Draw', PenLine], ['type', 'Type', TypeIcon]] as const).map(([value, label, Icon]) => (
              <button
                key={value}
                onClick={() => { setKind(value); setStamp(null); setMoved(null); }}
                className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium border transition-colors ${
                  kind === value ? 'bg-foreground text-white border-foreground' : 'border-border hover:bg-muted'
                }`}
              >
                <Icon className="w-3.5 h-3.5" /> {label}
              </button>
            ))}
          </div>

          {kind === 'draw' ? (
            <div>
              <canvas
                ref={canvasRef}
                width={640}
                height={220}
                onPointerDown={padDown}
                onPointerMove={padMove}
                onPointerUp={padUp}
                onPointerLeave={padUp}
                className="w-full h-40 bg-white border border-border rounded-xl touch-none cursor-crosshair"
              />
              <button
                onClick={clearPad}
                className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium border border-border hover:bg-muted transition-colors"
              >
                <Eraser className="w-3 h-3" /> Clear
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <input
                value={name}
                onChange={(e) => { setName(e.target.value); setStamp(null); }}
                placeholder="Your name"
                className={inputClass}
                aria-label="Signature name"
              />
              <div>
                <p className="text-[12px] font-medium text-foreground mb-1.5">Should it be handwritten?</p>
                <div className="flex gap-1.5">
                  {([[true, 'Yes, handwrite it'], [false, 'No, keep it typed']] as const).map(([value, label]) => (
                    <button
                      key={String(value)}
                      onClick={() => { setHandwritten(value); setStamp(null); }}
                      className={`flex-1 px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-colors ${
                        handwritten === value ? 'bg-foreground text-white border-foreground' : 'border-border hover:bg-muted'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              {name.trim() && (
                <p
                  className="px-3 py-4 bg-white border border-border rounded-xl text-center text-2xl truncate"
                  style={{ fontFamily: handwritten ? handwriting.style.fontFamily : TYPED_FONT, color: INK }}
                >
                  {name}
                </p>
              )}
            </div>
          )}

          <button
            onClick={build}
            className="w-full px-3 py-2 rounded-lg text-[13px] font-medium border border-border hover:bg-muted transition-colors"
          >
            {stamp ? 'Rebuild signature' : 'Put it on the page'}
          </button>

          {error && <p className="text-[12px] text-destructive">{error}</p>}
          {stamp && (
            <p className="text-[11px] text-muted-foreground leading-snug">
              Click the page to move it there, drag it to nudge, or pull the corner to resize.
              It goes on page {current + 1}.
            </p>
          )}
        </div>

        {/* Place it */}
        <div className="flex flex-col min-h-0">
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
              <span className="text-xs text-muted-foreground tabular-nums">Page {current + 1} of {previews.length}</span>
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

          <div className="flex-1 min-h-0 overflow-auto bg-gray-200/70 p-6 flex justify-center">
            {loading ? (
              <Loading message="Rendering the document…" />
            ) : page ? (
              <div
                ref={surface}
                onClick={placeAt}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                className={`relative inline-block self-start shadow-xl max-w-full ${stamp ? 'cursor-crosshair' : ''}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={page.url} alt={`Page ${current + 1}`} draggable={false} className="block max-w-full h-auto select-none" />

                {stamp && box && (
                  <div
                    onPointerDown={(e) => startDrag(e, 'move')}
                    className="absolute cursor-move ring-2 ring-primary/70"
                    style={{
                      left: `${(box.x / page.pointWidth) * 100}%`,
                      top: `${((page.pointHeight - box.y - height) / page.pointHeight) * 100}%`,
                      width: `${(box.width / page.pointWidth) * 100}%`,
                      height: `${(height / page.pointHeight) * 100}%`,
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={stamp.url} alt="Signature" draggable={false} className="w-full h-full select-none" />
                    <span
                      onPointerDown={(e) => startDrag(e, 'resize')}
                      className="absolute -right-1.5 -bottom-1.5 w-4 h-4 rounded-sm bg-primary text-white flex items-center justify-center cursor-nwse-resize"
                    >
                      <MoveDiagonal className="w-2.5 h-2.5" />
                    </span>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}
