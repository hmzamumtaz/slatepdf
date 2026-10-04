'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Highlighter, Loader2, PenLine, PenTool, Trash2, Type, Undo2, X } from 'lucide-react';
import { releaseCanvas, type Corner } from '@/lib/document-scanner';
import { applyMarks, renderPageCanvas, rotatePoint, unrotatePoint, type PageMark, type ScanPage } from '@/lib/scan-session';

type Tool = 'pen' | 'highlight' | 'text' | 'sign';

const PEN_COLORS = ['#111827', '#1d4ed8', '#dc2626', '#15803d'];
const HIGHLIGHT_COLORS = ['#facc15', '#4ade80', '#f472b6', '#60a5fa'];
const SIGNATURE_KEY = 'slatepdf-signature';

interface Props {
  page: ScanPage;
  onCancel: () => void;
  onDone: (marks: PageMark[]) => void;
}

/** Stored (pre-rotation) mark → how it shows on the rotated page, and back. */
function toDisplay(m: PageMark, rotation: number): PageMark {
  if (m.kind === 'pen' || m.kind === 'highlight') return { ...m, points: m.points.map(p => rotatePoint(p, rotation)) };
  const p = rotatePoint({ x: m.x, y: m.y }, rotation);
  return { ...m, x: p.x, y: p.y, angle: m.angle + rotation };
}

function toStored(m: PageMark, rotation: number): PageMark {
  if (m.kind === 'pen' || m.kind === 'highlight') return { ...m, points: m.points.map(p => unrotatePoint(p, rotation)) };
  const p = unrotatePoint({ x: m.x, y: m.y }, rotation);
  return { ...m, x: p.x, y: p.y, angle: m.angle - rotation };
}

/** Axis-aligned box of a text/signature mark, in display pixels. */
function markBox(m: PageMark, W: number, H: number, ctx: CanvasRenderingContext2D | null): { x0: number; y0: number; x1: number; y1: number } | null {
  const long = Math.max(W, H);
  const quarter = (((m.kind === 'text' || m.kind === 'image') ? m.angle : 0) % 180 + 180) % 180 === 90;
  let w = 0;
  let h = 0;
  if (m.kind === 'text') {
    const size = Math.max(6, m.size * long);
    if (ctx) ctx.font = `600 ${size}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
    const lines = m.text.split('\n');
    w = Math.max(...lines.map(l => (ctx ? ctx.measureText(l).width : l.length * size * 0.55)));
    h = lines.length * size * 1.2;
  } else if (m.kind === 'image') {
    w = m.w * long;
    h = w / m.aspect;
  } else {
    return null;
  }
  if (quarter) [w, h] = [h, w];
  const cx = m.x * W;
  const cy = m.y * H;
  const pad = 10;
  return { x0: cx - w / 2 - pad, y0: cy - h / 2 - pad, x1: cx + w / 2 + pad, y1: cy + h / 2 + pad };
}

/** Crop a drawn signature to its ink and return it as a PNG data URL. */
function trimSignature(c: HTMLCanvasElement): { src: string; aspect: number } | null {
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  const { data, width, height } = ctx.getImageData(0, 0, c.width, c.height);
  let x0 = width, y0 = height, x1 = -1, y1 = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 20) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return null;
  const pad = 6;
  x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad);
  x1 = Math.min(width - 1, x1 + pad); y1 = Math.min(height - 1, y1 + pad);
  const out = document.createElement('canvas');
  out.width = x1 - x0 + 1;
  out.height = y1 - y0 + 1;
  out.getContext('2d')?.drawImage(c, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
  const src = out.toDataURL('image/png');
  const aspect = out.width / out.height;
  releaseCanvas(out);
  return { src, aspect };
}

function SignaturePad({ onCancel, onUse }: { onCancel: () => void; onUse: (sig: { src: string; aspect: number }) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [empty, setEmpty] = useState(true);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const r = c.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = Math.round(r.width * dpr);
    c.height = Math.round(r.height * dpr);
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#111827';
  }, []);

  const pos = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-end bg-black/60">
      <div className="rounded-t-3xl bg-gray-900 px-5 pt-4 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]">
        <div className="flex items-center justify-between mb-3">
          <p className="text-base font-bold">Draw your signature</p>
          <button onClick={onCancel} className="p-2.5 rounded-full hover:bg-white/10" aria-label="Close signature pad"><X className="w-5 h-5" /></button>
        </div>
        <canvas
          ref={ref}
          className="w-full h-44 rounded-xl bg-white"
          style={{ touchAction: 'none' }}
          onPointerDown={e => {
            const ctx = ref.current?.getContext('2d');
            if (!ctx) return;
            (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
            drawing.current = true;
            const p = pos(e);
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x + 0.1, p.y + 0.1);
            ctx.stroke();
            setEmpty(false);
          }}
          onPointerMove={e => {
            if (!drawing.current) return;
            const ctx = ref.current?.getContext('2d');
            if (!ctx) return;
            const p = pos(e);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
          }}
          onPointerUp={() => { drawing.current = false; }}
          onPointerCancel={() => { drawing.current = false; }}
        />
        <div className="flex gap-3 mt-4">
          <button
            onClick={() => {
              const c = ref.current;
              const ctx = c?.getContext('2d');
              if (c && ctx) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, c.width, c.height); ctx.restore(); }
              setEmpty(true);
            }}
            className="flex-1 min-h-11 rounded-xl bg-white/10 text-sm font-semibold"
          >
            Clear
          </button>
          <button
            disabled={empty}
            onClick={() => { const c = ref.current; const sig = c ? trimSignature(c) : null; if (sig) onUse(sig); }}
            className="flex-1 min-h-11 rounded-xl bg-violet-600 text-sm font-semibold disabled:opacity-40"
          >
            Use signature
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Draw, highlight, type and sign on a page. Marks are kept as data, so they
 * stay sharp and can be undone; rotation is handled when they're stored.
 */
export default function MarkupEditor({ page, onCancel, onDone }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const baseRef = useRef<HTMLCanvasElement | null>(null);
  const marksRef = useRef<PageMark[]>(page.marks.map(m => toDisplay(m, page.rotation)));
  const historyRef = useRef<PageMark[][]>([]);
  const drawingRef = useRef<PageMark | null>(null);
  const dragRef = useRef<{ index: number; dx: number; dy: number } | null>(null);
  const drawSeq = useRef(0);

  const [ready, setReady] = useState(false);
  const [tool, setTool] = useState<Tool>('pen');
  const [penColor, setPenColor] = useState(PEN_COLORS[0]);
  const [hiColor, setHiColor] = useState(HIGHLIGHT_COLORS[0]);
  const [penWidth, setPenWidth] = useState(0.004);
  const [selected, setSelected] = useState<number | null>(null);
  const [textInput, setTextInput] = useState<{ x: number; y: number; value: string; index: number | null } | null>(null);
  const [padOpen, setPadOpen] = useState(false);
  const [savedSig, setSavedSig] = useState<{ src: string; aspect: number } | null>(null);
  // Render reads this snapshot; event handlers work on the refs.
  const [view, setView] = useState<{ marks: PageMark[]; canUndo: boolean }>(() => ({ marks: page.marks.map(m => toDisplay(m, page.rotation)), canUndo: false }));
  const sync = () => setView({ marks: marksRef.current, canUndo: historyRef.current.length > 0 });

  const redraw = useCallback(() => {
    const view = canvasRef.current;
    const base = baseRef.current;
    if (!view || !base) return;
    const seq = ++drawSeq.current;
    const tmp = document.createElement('canvas');
    tmp.width = base.width;
    tmp.height = base.height;
    tmp.getContext('2d')?.drawImage(base, 0, 0);
    const all = drawingRef.current ? [...marksRef.current, drawingRef.current] : marksRef.current;
    void applyMarks(tmp, all).then(() => {
      if (seq === drawSeq.current) view.getContext('2d')?.drawImage(tmp, 0, 0);
      releaseCanvas(tmp);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    void renderPageCanvas({ ...page, marks: [] }, 1600).then(c => {
      if (cancelled || !canvasRef.current) { releaseCanvas(c); return; }
      baseRef.current = c;
      canvasRef.current.width = c.width;
      canvasRef.current.height = c.height;
      redraw();
      setReady(true);
    });
    try {
      const raw = window.localStorage.getItem(SIGNATURE_KEY);
      if (raw) {
        const sig = JSON.parse(raw) as { src: string; aspect: number };
        if (sig?.src?.startsWith('data:image/png') && sig.aspect > 0) void Promise.resolve().then(() => { if (!cancelled) setSavedSig(sig); });
      }
    } catch { /* storage blocked */ }
    return () => {
      cancelled = true;
      releaseCanvas(baseRef.current);
    };
  }, [page, redraw]);

  const commit = (next: PageMark[]) => {
    historyRef.current.push(marksRef.current);
    if (historyRef.current.length > 50) historyRef.current.shift();
    marksRef.current = next;
    sync();
    redraw();
  };

  const pt = (e: React.PointerEvent): Corner | null => {
    const el = canvasRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
  };

  const hitTest = (p: Corner): number | null => {
    const c = canvasRef.current;
    if (!c) return null;
    const ctx = c.getContext('2d');
    const marks = marksRef.current;
    for (let i = marks.length - 1; i >= 0; i--) {
      const b = markBox(marks[i], c.width, c.height, ctx);
      const x = p.x * c.width;
      const y = p.y * c.height;
      if (b && x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1) return i;
    }
    return null;
  };

  const onDown = (e: React.PointerEvent) => {
    const p = pt(e);
    if (!p || !ready) return;
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    const hit = hitTest(p);
    if (hit !== null && (tool === 'text' || tool === 'sign' || selected !== null)) {
      const m = marksRef.current[hit];
      if (m.kind === 'text' || m.kind === 'image') {
        historyRef.current.push(marksRef.current);
        marksRef.current = marksRef.current.slice();
        dragRef.current = { index: hit, dx: p.x - m.x, dy: p.y - m.y };
        setSelected(hit);
        return;
      }
    }
    setSelected(null);
    if (tool === 'pen' || tool === 'highlight') {
      drawingRef.current = tool === 'pen'
        ? { kind: 'pen', points: [p], width: penWidth, color: penColor }
        : { kind: 'highlight', points: [p], width: 0.03, color: hiColor };
      redraw();
    } else if (tool === 'text') {
      setTextInput({ x: p.x, y: p.y, value: '', index: null });
    } else if (tool === 'sign') {
      if (savedSig) placeSignature(savedSig, p);
      else setPadOpen(true);
    }
  };

  const onMove = (e: React.PointerEvent) => {
    const p = pt(e);
    if (!p) return;
    if (dragRef.current) {
      const { index, dx, dy } = dragRef.current;
      const m = marksRef.current[index];
      if (m && (m.kind === 'text' || m.kind === 'image')) {
        marksRef.current[index] = { ...m, x: Math.min(1, Math.max(0, p.x - dx)), y: Math.min(1, Math.max(0, p.y - dy)) };
        redraw();
      }
      return;
    }
    const d = drawingRef.current;
    if (d && (d.kind === 'pen' || d.kind === 'highlight')) {
      d.points.push(p);
      redraw();
    }
  };

  const onUp = () => {
    if (dragRef.current) {
      dragRef.current = null;
      sync();
      return;
    }
    const d = drawingRef.current;
    if (!d) return;
    drawingRef.current = null;
    commit([...marksRef.current, d]);
  };

  const placeSignature = (sig: { src: string; aspect: number }, at?: Corner) => {
    const mark: PageMark = { kind: 'image', x: at?.x ?? 0.5, y: at?.y ?? 0.75, w: 0.3, aspect: sig.aspect, src: sig.src, angle: 0 };
    commit([...marksRef.current, mark]);
    setSelected(marksRef.current.length - 1);
  };

  const finishText = () => {
    if (!textInput) return;
    const value = textInput.value.trim();
    if (textInput.index !== null) {
      const next = marksRef.current.slice();
      const m = next[textInput.index];
      if (m?.kind === 'text') {
        if (value) next[textInput.index] = { ...m, text: value };
        else next.splice(textInput.index, 1);
        commit(next);
      }
    } else if (value) {
      commit([...marksRef.current, { kind: 'text', x: textInput.x, y: textInput.y, text: value, size: 0.03, color: penColor, angle: 0 }]);
      setSelected(marksRef.current.length - 1);
    }
    setTextInput(null);
  };

  const sel = selected !== null ? view.marks[selected] ?? null : null;

  const resizeSelected = (v: number) => {
    if (selected === null) return;
    const next = marksRef.current.slice();
    const m = next[selected];
    if (m?.kind === 'text') next[selected] = { ...m, size: v };
    else if (m?.kind === 'image') next[selected] = { ...m, w: v };
    marksRef.current = next;
    sync();
    redraw();
  };

  const deleteSelected = () => {
    if (selected === null) return;
    commit(marksRef.current.filter((_, i) => i !== selected));
    setSelected(null);
  };

  const undo = () => {
    const prev = historyRef.current.pop();
    if (!prev) return;
    marksRef.current = prev;
    setSelected(null);
    sync();
    redraw();
  };

  const finish = () => onDone(marksRef.current.map(m => toStored(m, page.rotation)));

  const colors = tool === 'highlight' ? HIGHLIGHT_COLORS : PEN_COLORS;
  const activeColor = tool === 'highlight' ? hiColor : penColor;
  const toolBtn = (t: Tool, label: string, icon: React.ReactNode) => (
    <button
      key={t}
      onClick={() => { setTool(t); setSelected(null); if (t === 'sign' && !savedSig) setPadOpen(true); }}
      className={`flex flex-col items-center gap-1 min-w-[4rem] min-h-11 px-2 py-1.5 rounded-xl text-[11px] font-semibold ${tool === t ? 'bg-white text-gray-900' : 'text-white/85'}`}
      aria-pressed={tool === t}
    >
      {icon}{label}
    </button>
  );

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-gray-950 text-white">
      <div className="flex items-center justify-between px-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-2">
        <button onClick={onCancel} className="p-2.5 rounded-full hover:bg-white/10" aria-label="Cancel markup"><X className="w-6 h-6" /></button>
        <p className="text-sm font-semibold">Markup</p>
        <div className="flex items-center gap-2">
          <button onClick={undo} disabled={!view.canUndo} className="p-2.5 rounded-full hover:bg-white/10 disabled:opacity-30" aria-label="Undo"><Undo2 className="w-5 h-5" /></button>
          <button onClick={finish} className="px-4 py-2 rounded-xl bg-violet-600 font-semibold text-sm flex items-center gap-1.5"><Check className="w-4 h-4" /> Done</button>
        </div>
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

      {textInput ? (
        <div className="px-4 pt-3 flex gap-2 max-w-md w-full mx-auto">
          <input
            autoFocus
            value={textInput.value}
            onChange={e => setTextInput({ ...textInput, value: e.target.value })}
            onKeyDown={e => { if (e.key === 'Enter') finishText(); }}
            placeholder="Type text to add"
            className="flex-1 min-h-11 rounded-xl bg-white/10 px-3 text-sm outline-none"
            aria-label="Text to add"
          />
          <button onClick={finishText} className="min-h-11 px-4 rounded-xl bg-violet-600 text-sm font-semibold">Add</button>
          <button onClick={() => setTextInput(null)} className="min-h-11 px-3 rounded-xl bg-white/10 text-sm" aria-label="Cancel text"><X className="w-4 h-4" /></button>
        </div>
      ) : sel && (sel.kind === 'text' || sel.kind === 'image') ? (
        <div className="px-4 pt-3 flex items-center gap-3 max-w-md w-full mx-auto">
          <span className="text-xs font-semibold w-10">Size</span>
          <input
            type="range"
            min={sel.kind === 'text' ? 0.012 : 0.08}
            max={sel.kind === 'text' ? 0.09 : 0.7}
            step={0.002}
            value={sel.kind === 'text' ? sel.size : sel.w}
            onChange={e => resizeSelected(Number(e.target.value))}
            onPointerUp={() => commit(marksRef.current.slice())}
            className="flex-1 accent-violet-500"
            aria-label="Size"
          />
          {sel.kind === 'text' && (
            <button onClick={() => setTextInput({ x: sel.x, y: sel.y, value: sel.text, index: selected })} className="min-h-11 px-3 rounded-xl bg-white/10 text-xs font-semibold">Edit</button>
          )}
          <button onClick={deleteSelected} className="min-h-11 px-3 rounded-xl bg-red-500/20 text-red-300" aria-label="Delete selected"><Trash2 className="w-4 h-4" /></button>
        </div>
      ) : (
        <div className="px-4 pt-3 flex items-center justify-center gap-3">
          {tool !== 'sign' && colors.map(c => (
            <button key={c} onClick={() => (tool === 'highlight' ? setHiColor(c) : setPenColor(c))} className={`w-9 h-9 rounded-full ring-2 ${activeColor === c ? 'ring-white' : 'ring-transparent'}`} style={{ backgroundColor: c }} aria-label={`Colour ${c}`} />
          ))}
          {tool === 'pen' && (
            <input type="range" min={0.0015} max={0.012} step={0.0005} value={penWidth} onChange={e => setPenWidth(Number(e.target.value))} className="w-28 accent-violet-500" aria-label="Pen width" />
          )}
          {tool === 'sign' && (
            <p className="text-xs text-white/70">{savedSig ? 'Tap the page to place your signature.' : 'Draw your signature first.'} <button onClick={() => setPadOpen(true)} className="underline">{savedSig ? 'New signature' : 'Draw'}</button></p>
          )}
        </div>
      )}
      <p className="text-center text-[11px] text-white/55 px-6 pt-2">
        {tool === 'text' ? 'Tap where the text should go. Drag text to move it.' : tool === 'sign' ? 'Drag the signature to move it; use Size to resize.' : 'Draw with your finger.'}
      </p>

      <div className="flex justify-center gap-1 px-2 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
        {toolBtn('pen', 'Pen', <PenLine className="w-5 h-5" />)}
        {toolBtn('highlight', 'Highlight', <Highlighter className="w-5 h-5" />)}
        {toolBtn('text', 'Text', <Type className="w-5 h-5" />)}
        {toolBtn('sign', 'Sign', <PenTool className="w-5 h-5" />)}
      </div>

      {padOpen && (
        <SignaturePad
          onCancel={() => setPadOpen(false)}
          onUse={sig => {
            setPadOpen(false);
            setSavedSig(sig);
            try { window.localStorage.setItem(SIGNATURE_KEY, JSON.stringify(sig)); } catch { /* storage blocked */ }
            placeSignature(sig);
          }}
        />
      )}
    </div>
  );
}
