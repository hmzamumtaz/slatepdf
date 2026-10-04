'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ImagePlus, Loader2, RefreshCw, X, Zap, ZapOff } from 'lucide-react';
import {
  detectDocumentCorners, detectDocumentCornersInImage, drawDetectionOverlayPixels, grabVideoFrame, refineCorners, splitBookQuad,
  type Corner, type PixelPoint, type ScanFilter,
} from '@/lib/document-scanner';
import { blobToCanvas, canvasToJpeg, FULL_QUAD, type PageLayout, type PagePart } from '@/lib/scan-session';

export type ScanMode = 'whiteboard' | 'book' | 'document' | 'id-card';

export interface CapturedPage {
  parts: PagePart[];
  layout: PageLayout;
  filter: ScanFilter;
  /** No page edges were found — the user should check the borders. */
  needsCrop: boolean;
}

const MODES: { value: ScanMode; label: string; filter: ScanFilter }[] = [
  { value: 'whiteboard', label: 'Whiteboard', filter: 'whiteboard' },
  { value: 'book', label: 'Book', filter: 'enhance' },
  { value: 'document', label: 'Document', filter: 'enhance' },
  { value: 'id-card', label: 'ID card', filter: 'enhance' },
];

const STEADY_STROKE = '#22c55e';
const TRACKING_STROKE = '#fbbf24';

interface Props {
  /** Stream opened in the tap that launched the scanner (null: it failed). */
  initialStream: MediaStream | null;
  pageCount: number;
  lastThumb: string | null;
  /** Retaking one page: document mode only, closes after one capture. */
  retake?: boolean;
  onCapture: (pages: CapturedPage[]) => void;
  onImport: (files: FileList) => void;
  onReview: () => void;
  onClose: () => void;
}

function smoothCorners(prev: Corner[] | null, raw: Corner[] | null): Corner[] | null {
  if (!prev || !raw || prev.length !== 4 || raw.length !== 4) return raw;
  const k = 0.35;
  return raw.map((c, i) => ({ x: prev[i].x + (c.x - prev[i].x) * k, y: prev[i].y + (c.y - prev[i].y) * k }));
}

function cornerDrift(a: Corner[] | null, b: Corner[] | null): number {
  if (!a || !b || a.length !== 4 || b.length !== 4) return Infinity;
  let s = 0;
  for (let i = 0; i < 4; i++) s += Math.hypot(a[i].x - b[i].x, a[i].y - b[i].y);
  return s / 4;
}

/** Ask for the camera. Call it straight from a tap: iOS only trusts user gestures. */
export function openCameraStream(face: 'environment' | 'user'): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    video: { facingMode: face, width: { ideal: 3840 }, height: { ideal: 2160 } },
    audio: false,
  });
}

/** Full-sensor still where the browser supports it (Chrome on Android). */
async function takeFullResPhoto(track: MediaStreamTrack | null): Promise<HTMLCanvasElement | null> {
  const IC = (window as unknown as { ImageCapture?: new (t: MediaStreamTrack) => { takePhoto: () => Promise<Blob> } }).ImageCapture;
  if (!IC || !track || track.readyState !== 'live') return null;
  try {
    const photo = await Promise.race([
      new IC(track).takePhoto(),
      new Promise<never>((_, reject) => window.setTimeout(() => reject(new Error('timeout')), 3500)),
    ]);
    return await blobToCanvas(photo, 3200);
  } catch {
    return null;
  }
}

export default function CameraScreen({ initialStream, pageCount, lastThumb, retake, onCapture, onImport, onReview, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef(0);
  const cornersRef = useRef<Corner[] | null>(null);
  const rawRef = useRef<Corner[] | null>(null);
  const stableRef = useRef(0);
  const streakRef = useRef(0);
  const armedRef = useRef(true);
  const busyRef = useRef(false);
  const autoRef = useRef(true);
  const modeRef = useRef<ScanMode>('document');
  const frontRef = useRef<PagePart | null>(null);
  const mountedRef = useRef(true);

  const [facing, setFacing] = useState<'environment' | 'user'>('environment');
  const [starting, setStarting] = useState(true);
  const [failed, setFailed] = useState<string | null>(null);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torch, setTorch] = useState(false);
  const [auto, setAuto] = useState(true);
  const [mode, setMode] = useState<ScanMode>('document');
  const [detect, setDetect] = useState<'searching' | 'found' | 'steady' | 'capturing'>('searching');
  const [flash, setFlash] = useState(0);
  const [frontDone, setFrontDone] = useState(false);

  useEffect(() => { autoRef.current = auto; }, [auto]);
  useEffect(() => { modeRef.current = mode; }, [mode]);

  /* ----------------------------- camera ----------------------------- */

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  const attachStream = useCallback((stream: MediaStream) => {
    streamRef.current = stream;
    const el = videoRef.current;
    if (el) {
      el.srcObject = stream;
      el.play().catch(() => undefined);
    }
    const track = stream.getVideoTracks()[0];
    const caps = (track?.getCapabilities?.() ?? {}) as { torch?: boolean };
    setTorchAvailable(!!caps.torch);
    setFailed(null);
    setStarting(false);
  }, []);

  const startStream = useCallback(async (face: 'environment' | 'user') => {
    stopStream();
    setStarting(true);
    setTorch(false);
    try {
      const stream = await openCameraStream(face);
      if (!mountedRef.current) { stream.getTracks().forEach(t => t.stop()); return; }
      attachStream(stream);
    } catch {
      if (mountedRef.current) {
        setFailed('Camera access was denied or is unavailable. You can still add photos from your gallery.');
        setStarting(false);
      }
    }
  }, [stopStream, attachStream]);

  useEffect(() => {
    mountedRef.current = true;
    const t = window.setTimeout(() => {
      if (initialStream) attachStream(initialStream);
      else {
        setFailed('Camera access was denied or is unavailable. You can still add photos from your gallery.');
        setStarting(false);
      }
    }, 0);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.clearTimeout(t);
      mountedRef.current = false;
      document.body.style.overflow = prevOverflow;
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      stopStream();
    };
  }, [initialStream, attachStream, stopStream]);

  const flip = () => {
    const next = facing === 'environment' ? 'user' : 'environment';
    setFacing(next);
    void startStream(next);
  };

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    try {
      await track.applyConstraints({ advanced: [{ torch: !torch } as MediaTrackConstraintSet] });
      setTorch(t => !t);
    } catch {
      setTorchAvailable(false);
    }
  };

  /* ---------------------------- overlay ----------------------------- */

  const drawOverlay = useCallback((quad: Corner[] | null, stroke: string) => {
    const canvas = overlayRef.current;
    const video = videoRef.current;
    if (!canvas?.parentElement) return;
    const w = canvas.parentElement.clientWidth;
    const h = canvas.parentElement.clientHeight;
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);
    if (!quad || !video?.videoWidth) return;
    // Reproduce object-cover so the outline sits on the visible page.
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const k = Math.max(w / vw, h / vh);
    const sx = (w - vw * k) / 2;
    const sy = (h - vh * k) / 2;
    const pts: PixelPoint[] = quad.map(p => ({ x: sx + p.x * vw * k, y: sy + p.y * vh * k }));
    drawDetectionOverlayPixels(ctx, pts, w, h, stroke);
    ctx.fillStyle = stroke === STEADY_STROKE ? 'rgba(34,197,94,0.14)' : 'rgba(251,191,36,0.10)';
    ctx.beginPath();
    pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.closePath();
    ctx.fill();
  }, []);

  /* ---------------------------- capture ----------------------------- */

  const capture = useCallback(async () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || busyRef.current) return;
    busyRef.current = true;
    setDetect('capturing');
    setFlash(f => f + 1);
    navigator.vibrate?.(30);
    try {
      const videoQuad = cornersRef.current;
      const track = streamRef.current?.getVideoTracks()[0] ?? null;
      let image = await takeFullResPhoto(track);
      let quad: Corner[] | null = null;
      if (image) {
        const sameShape = Math.abs(image.width / image.height - video.videoWidth / video.videoHeight) < 0.03;
        quad = sameShape && videoQuad ? videoQuad : detectDocumentCornersInImage(image);
        if (!quad && !sameShape) image = null; // can't map the live outline onto a differently framed photo
      }
      if (!image) {
        image = grabVideoFrame(video, 3200);
        quad = videoQuad;
      }
      if (!image) return;
      const source = await canvasToJpeg(image, 0.92);
      const m = retake ? 'document' : modeRef.current;
      const filter = MODES.find(x => x.value === m)?.filter ?? 'enhance';
      const needsCrop = !quad;
      const q = quad ? refineCorners(image, quad) : FULL_QUAD;

      if (m === 'book') {
        const [left, right] = splitBookQuad(q);
        onCapture([
          { parts: [{ source, quad: left }], layout: 'single', filter, needsCrop },
          { parts: [{ source, quad: right }], layout: 'single', filter, needsCrop },
        ]);
      } else if (m === 'id-card') {
        if (!frontRef.current) {
          frontRef.current = { source, quad: q };
          setFrontDone(true);
        } else {
          const front = frontRef.current;
          frontRef.current = null;
          setFrontDone(false);
          onCapture([{ parts: [front, { source, quad: q }], layout: 'id-card', filter, needsCrop }]);
        }
      } else {
        onCapture([{ parts: [{ source, quad: q }], layout: 'single', filter, needsCrop }]);
      }
    } finally {
      busyRef.current = false;
      if (mountedRef.current) setDetect('searching');
    }
  }, [onCapture, retake]);

  const skipBack = () => {
    const front = frontRef.current;
    if (!front) return;
    frontRef.current = null;
    setFrontDone(false);
    onCapture([{ parts: [front], layout: 'id-card', filter: 'enhance', needsCrop: false }]);
  };

  /* --------------------------- detection ---------------------------- */

  useEffect(() => {
    const tick = () => {
      rafRef.current = requestAnimationFrame(tick);
      const video = videoRef.current;
      if (!video || video.readyState < 2 || busyRef.current) return;
      const now = performance.now();
      if (now - lastTickRef.current < 80) return;
      lastTickRef.current = now;

      let raw: Corner[] | null = null;
      try { raw = detectDocumentCorners(video); } catch { raw = null; }
      const prevRaw = rawRef.current;
      rawRef.current = raw;
      const smooth = smoothCorners(cornersRef.current, raw);
      cornersRef.current = smooth;

      if (raw) {
        streakRef.current++;
        stableRef.current = cornerDrift(prevRaw, raw) < 0.004 ? stableRef.current + 1 : 0;
        const steady = stableRef.current >= 3 && streakRef.current >= 4;
        drawOverlay(smooth, steady ? STEADY_STROKE : TRACKING_STROKE);
        setDetect(steady ? 'steady' : 'found');
        if (steady && autoRef.current && armedRef.current) {
          // Fire once per page: re-arm only after the page leaves the frame.
          armedRef.current = false;
          void capture();
        }
      } else {
        streakRef.current = 0;
        stableRef.current = 0;
        armedRef.current = true;
        drawOverlay(null, '');
        setDetect('searching');
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current != null) cancelAnimationFrame(rafRef.current); };
  }, [capture, drawOverlay]);

  const status =
    detect === 'capturing' ? 'Capturing…'
      : mode === 'id-card' && !retake ? (frontDone ? 'Now turn the card over and scan the back' : 'Scan the front of the card')
        : detect === 'steady' ? (auto ? 'Hold steady…' : 'Page found — tap the shutter')
          : detect === 'found' ? (auto ? 'Page found — hold steady' : 'Page found — tap the shutter')
            : mode === 'book' && !retake ? 'Line up the spine with the center line'
              : 'Looking for a document';

  return (
    <div className="fixed inset-0 z-[70] bg-black text-white select-none overflow-hidden" style={{ height: '100dvh', touchAction: 'none', overscrollBehavior: 'none' }}>
      <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
      <canvas ref={overlayRef} className="absolute inset-0 w-full h-full pointer-events-none" />

      {mode === 'book' && !retake && <div className="absolute top-24 bottom-56 left-1/2 border-l-2 border-dashed border-white/50 pointer-events-none" />}
      {mode === 'id-card' && !retake && detect === 'searching' && (
        <div className="absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2 w-[78vw] max-w-sm aspect-[85.6/54] border-2 border-dashed border-white/60 rounded-2xl pointer-events-none" />
      )}
      {flash > 0 && <div key={flash} className="absolute inset-0 bg-white pointer-events-none animate-[scanflash_350ms_ease-out_forwards]" />}
      <style>{'@keyframes scanflash{from{opacity:.85}to{opacity:0}}'}</style>

      {(starting || failed) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 text-center">
          {starting ? <><Loader2 className="w-8 h-8 animate-spin" /><p className="text-sm">Starting camera…</p></> : (
            <>
              <p className="text-sm">{failed}</p>
              <button onClick={() => fileRef.current?.click()} className="px-5 py-3 rounded-xl bg-violet-600 font-semibold text-sm">Choose photos</button>
            </>
          )}
        </div>
      )}

      {/* Top bar */}
      <div className="absolute top-0 inset-x-0 px-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-8 bg-gradient-to-b from-black/60 to-transparent flex items-center justify-between">
        <button onClick={onClose} className="p-2.5 rounded-full bg-black/40" aria-label="Close camera"><X className="w-5 h-5" /></button>
        <div className="flex items-center gap-2">
          {torchAvailable && (
            <button onClick={toggleTorch} className={`p-2.5 rounded-full ${torch ? 'bg-yellow-400 text-black' : 'bg-black/40'}`} aria-label={torch ? 'Turn flash off' : 'Turn flash on'}>
              {torch ? <Zap className="w-5 h-5" /> : <ZapOff className="w-5 h-5" />}
            </button>
          )}
          <button onClick={() => setAuto(a => !a)} className={`px-3 py-2 rounded-full text-xs font-semibold ${auto ? 'bg-green-500 text-white' : 'bg-black/40 text-white/80'}`} aria-pressed={auto}>
            Auto capture {auto ? 'on' : 'off'}
          </button>
          <button onClick={flip} className="p-2.5 rounded-full bg-black/40" aria-label="Switch camera"><RefreshCw className="w-5 h-5" /></button>
        </div>
      </div>

      {/* Bottom controls */}
      <div className="absolute bottom-0 inset-x-0 pt-16 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] bg-gradient-to-t from-black/85 via-black/60 to-transparent">
        <p className="text-center text-sm font-medium mb-3 px-4 flex items-center justify-center gap-2">
          <span className={`inline-block w-2 h-2 rounded-full ${detect === 'steady' ? 'bg-green-400' : detect === 'found' ? 'bg-amber-400' : 'bg-white/40'}`} />
          {retake ? `Retake page · ${status}` : status}
        </p>
        {mode === 'id-card' && frontDone && (
          <div className="flex justify-center mb-3">
            <button onClick={skipBack} className="px-4 py-1.5 rounded-full bg-white/15 text-xs font-semibold">Front only — skip the back</button>
          </div>
        )}

        {!retake && (
          <div className="flex justify-center gap-1 mb-4 px-2 overflow-x-auto">
            {MODES.map(m => (
              <button
                key={m.value}
                onClick={() => { setMode(m.value); frontRef.current = null; setFrontDone(false); }}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${mode === m.value ? 'bg-white text-gray-900' : 'text-white/75'}`}
              >
                {m.label}
              </button>
            ))}
          </div>
        )}

        <div className="max-w-md mx-auto flex items-center justify-between px-8">
          {/* Thumbnail stack → review */}
          <button onClick={onReview} disabled={pageCount === 0} className="relative w-14 h-14 rounded-lg overflow-hidden ring-2 ring-white/70 bg-white/10 disabled:opacity-40" aria-label="Review scanned pages">
            {lastThumb && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={lastThumb} alt="" className="w-full h-full object-cover" />
            )}
            {pageCount > 0 && <span className="absolute -top-0 -right-0 min-w-5 h-5 px-1 rounded-bl-lg bg-violet-600 text-[11px] font-bold flex items-center justify-center">{pageCount}</span>}
          </button>

          <button
            onClick={() => { armedRef.current = false; void capture(); }}
            disabled={starting || !!failed}
            className="w-20 h-20 rounded-full bg-white ring-4 ring-white/30 active:scale-95 transition-transform flex items-center justify-center disabled:opacity-40"
            aria-label="Capture page"
          >
            <span className="w-16 h-16 rounded-full border-[3px] border-gray-900/80" />
          </button>

          <button onClick={() => fileRef.current?.click()} className="w-14 h-14 rounded-lg bg-white/10 flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold" aria-label="Import photos">
            <ImagePlus className="w-5 h-5" /> Photos
          </button>
        </div>
      </div>

      <input ref={fileRef} type="file" accept="image/*" multiple={!retake} className="hidden" onChange={e => { if (e.target.files?.length) onImport(e.target.files); e.target.value = ''; }} />
    </div>
  );
}
