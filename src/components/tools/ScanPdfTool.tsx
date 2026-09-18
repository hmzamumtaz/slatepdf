'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  Camera, ImagePlus, ScanLine, ArrowLeft, RefreshCw, Trash2, ChevronLeft, ChevronRight,
  FileDown, Loader2, AlertCircle, CheckCircle2, X, Smartphone, Link2, Download,
  Wand2, Scan as ScanIcon, SlidersHorizontal,
} from 'lucide-react';
import Link from 'next/link';
import { scannedPagesToPdf, getOutputFilename, downloadBlob, type ScanPdfOptions } from '@/lib/pdf-engine';
import { friendlyError } from '@/lib/errors';
import { trackConversion } from '@/lib/stats';
import {
  detectDocumentCorners, warpPageFrame, drawDetectionOverlay, applyFilter,
  type Corner, type ScanFilter,
} from '@/lib/document-scanner';

interface ScannedPage {
  id: number;
  url: string;
}

const PAGE_SIZES: { label: string; value: NonNullable<ScanPdfOptions['pageSize']> }[] = [
  { label: 'A4', value: 'a4' },
  { label: 'A4 landscape', value: 'a4-landscape' },
  { label: 'Letter', value: 'letter' },
  { label: 'Match image', value: 'original' },
];

const FILTERS: { label: string; value: ScanFilter }[] = [
  { label: 'Photo', value: 'photo' },
  { label: 'Magic', value: 'enhance' },
  { label: 'B&W', value: 'bw' },
  { label: 'Gray', value: 'grayscale' },
];

const FULL_FRAME: Corner[] = [{ x: 0, y: 0 }, { x: 0.995, y: 0 }, { x: 0.995, y: 0.995 }, { x: 0, y: 0.995 }];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(2)} MB`;
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

export default function ScanPdfTool() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const overlayCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const pendingStreamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nextId = useRef(1);
  const pagesRef = useRef<ScannedPage[]>([]);
  const isMounted = useRef(true);
  const detectRafRef = useRef<number | null>(null);
  const lastTickRef = useRef(0);
  const lastCornersRef = useRef<Corner[] | null>(null);
  const lastRawRef = useRef<Corner[] | null>(null);
  const stableCountRef = useRef(0);
  const armedRef = useRef(true);
  const capturingRef = useRef(false);
  const autoScanRef = useRef(true);
  const filterRef = useRef<ScanFilter>('photo');
  const overlaySizeRef = useRef({ w: 0, h: 0 });

  const [pages, setPages] = useState<ScannedPage[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraBusy, setCameraBusy] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [fallbackMode, setFallbackMode] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState<NonNullable<ScanPdfOptions['pageSize']>>('a4');
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Blob | null>(null);
  const [justScan, setJustScan] = useState(false);
  const [autoScan, setAutoScan] = useState(true);
  const [filter, setFilter] = useState<ScanFilter>('photo');
  const [detectState, setDetectState] = useState<'disabled' | 'searching' | 'found' | 'steady' | 'capturing'>('disabled');
  const [showPhotos, setShowPhotos] = useState(false);
  const [copied, setCopied] = useState(false);

  const isMobile = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
    const touch = navigator.maxTouchPoints > 0;
    return /Mobi|Android|iPhone|iPad|iPod|Silk/i.test(navigator.userAgent) || (coarse && touch);
  }, []);

  useEffect(() => {
    autoScanRef.current = autoScan;
  }, [autoScan]);

  useEffect(() => {
    filterRef.current = filter;
  }, [filter]);

  // Binds a stream captured in the click handler to the <video> the moment it
  // mounts. getUserMedia must be called inside the user gesture (iOS), but the
  // element only exists after React renders — the pending stream makes both work.
  const videoCallback = useCallback((el: HTMLVideoElement | null) => {
    videoRef.current = el;
    const pending = pendingStreamRef.current;
    if (el && pending) {
      pendingStreamRef.current = null;
      el.srcObject = pending;
      el.play().catch(() => undefined);
    }
  }, []);

  const attachStream = useCallback(() => {
    pendingStreamRef.current = null;
    const el = videoRef.current;
    const stream = streamRef.current;
    if (el && stream) {
      el.srcObject = stream;
      el.play().catch(() => undefined);
    }
  }, []);

  /* ------------------------- detection loop ------------------------- */

  const stopDetection = useCallback(() => {
    if (detectRafRef.current != null) {
      cancelAnimationFrame(detectRafRef.current);
      detectRafRef.current = null;
    }
    lastCornersRef.current = null;
    lastRawRef.current = null;
    stableCountRef.current = 0;
    armedRef.current = true;
    const canvas = overlayRef.current;
    if (canvas) overlayCtxRef.current?.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  const ensureOverlaySize = useCallback(() => {
    const canvas = overlayRef.current;
    if (!canvas?.parentElement) return;
    const w = canvas.parentElement.clientWidth;
    const h = canvas.parentElement.clientHeight;
    if (w > 0 && h > 0 && (overlaySizeRef.current.w !== w || overlaySizeRef.current.h !== h)) {
      canvas.width = w;
      canvas.height = h;
      overlaySizeRef.current = { w, h };
    }
  }, []);

  const addPhoto = useCallback((blob: Blob) => {
    const url = URL.createObjectURL(blob);
    setPages(prev => {
      const next = [...prev, { id: nextId.current++, url }];
      pagesRef.current = next;
      return next;
    });
    setSelected(null);
  }, []);

  const captureFull = useCallback(async () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || capturingRef.current) return;
    capturingRef.current = true;
    setDetectState('capturing');
    try {
      const quad = lastCornersRef.current ?? FULL_FRAME;
      const frame = warpPageFrame(video, quad, filterRef.current);
      if (!frame) { setError('Could not process the camera frame. Try again.'); return; }
      const blob = await new Promise<Blob | null>(res => frame.toBlob(b => res(b), 'image/jpeg', 0.9));
      if (blob) {
        await new Promise(r => window.setTimeout(r, 60)); // let the flash paint
        addPhoto(blob);
        setJustScan(true);
        window.setTimeout(() => setJustScan(false), 380);
      }
    } finally {
      capturingRef.current = false;
      if (lastCornersRef.current) setDetectState('steady'); else setDetectState('found');
    }
  }, [addPhoto]);

  const startDetection = useCallback(() => {
    if (detectRafRef.current != null) return;
    const tick = () => {
      detectRafRef.current = window.requestAnimationFrame(tick);
      const video = videoRef.current;
      if (!video || video.readyState < 2 || !isMounted.current) return;
      const now = performance.now();
      if (now - lastTickRef.current < 110) return;
      lastTickRef.current = now;
      ensureOverlaySize();
      let raw: Corner[] | null = null;
      try {
        raw = detectDocumentCorners(video);
      } catch {
        raw = null;
      }
      const smooth = smoothCorners(lastCornersRef.current, raw);
      lastCornersRef.current = smooth;
      lastRawRef.current = raw;
      const ctx = overlayCtxRef.current;
      const canvas = overlayRef.current;
      if (ctx && canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (smooth) drawDetectionOverlay(ctx, smooth, canvas.width, canvas.height);
      }
      if (raw) {
        const drift = cornerDrift(lastRawRef.current, raw);
        if (drift < 0.004) {
          stableCountRef.current++;
          if (stableCountRef.current >= 7 && autoScanRef.current && armedRef.current) {
            armedRef.current = false;
            void captureFull();
          } else {
            setDetectState(stableCountRef.current >= 3 ? 'steady' : 'found');
          }
        } else {
          stableCountRef.current = 0;
          armedRef.current = true;
          setDetectState('found');
        }
      } else {
        stableCountRef.current = 0;
        armedRef.current = true;
        setDetectState('searching');
      }
    };
    detectRafRef.current = window.requestAnimationFrame(tick);
  }, [ensureOverlaySize, captureFull]);

  useEffect(() => {
    if (!cameraOn) {
      stopDetection();
      const t = window.setTimeout(() => { if (isMounted.current) setDetectState('disabled'); }, 0);
      return () => window.clearTimeout(t);
    }
    overlayCtxRef.current = overlayRef.current?.getContext('2d') ?? null;
const resetToSearching = window.setTimeout(() => { if (isMounted.current) setDetectState('searching'); }, 0);
      startDetection();
      return () => {
        window.clearTimeout(resetToSearching);
        stopDetection();
      };
  }, [cameraOn, startDetection, stopDetection]);

  /* --------------------------- camera --------------------------- */

  const closeCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    if (pendingStreamRef.current) {
      pendingStreamRef.current.getTracks().forEach(track => track.stop());
      pendingStreamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
    setCameraBusy(false);
    setCameraFacing('environment');
  }, []);

  const handleOpenCamera = useCallback(async () => {
    setError(null);
    setResult(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setFallbackMode('Camera is not available in this browser, so add photos instead.');
      return;
    }
    setCameraOn(true);
    setCameraBusy(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: cameraFacing, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      if (!isMounted.current || !cameraOn) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      pendingStreamRef.current = stream;
      streamRef.current = stream;
      attachStream();
      setFallbackMode(null);
    } catch {
      if (isMounted.current) {
        setCameraOn(false);
        setFallbackMode('Camera access was denied or unavailable. You can still build a PDF from photos in your gallery.');
      }
    } finally {
      if (isMounted.current) setCameraBusy(false);
    }
  }, [cameraFacing, cameraOn, attachStream]);

  const toggleCamera = useCallback(async () => {
    if (cameraOn) {
      closeCamera();
      return;
    }
    await handleOpenCamera();
  }, [cameraOn, closeCamera, handleOpenCamera]);

  const flipCamera = useCallback(async () => {
    const next = cameraFacing === 'environment' ? 'user' : 'environment';
    setCameraFacing(next);
    setCameraBusy(true);
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: next, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      if (!isMounted.current || !cameraOn) {
        stream.getTracks().forEach(track => track.stop());
        return;
      }
      pendingStreamRef.current = stream;
      streamRef.current = stream;
      attachStream();
      setFallbackMode(null);
    } catch {
      setFallbackMode('Switching cameras failed. Continue with what you have.');
    } finally {
      if (isMounted.current) setCameraBusy(false);
    }
  }, [cameraFacing, cameraOn, attachStream]);

  /* --------------------------- pages --------------------------- */

  const finalizeImage = useCallback(async (canvas: HTMLCanvasElement): Promise<Blob | null> => {
    const rendered = filterRef.current === 'photo' ? canvas : applyFilter(canvas, filterRef.current);
    return new Promise<Blob | null>(res => rendered.toBlob(b => res(b), 'image/jpeg', 0.9));
  }, []);

  const handleFilesSelected = useCallback(async (files: FileList | File[]) => {
    setError(null);
    setResult(null);
    const list = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (list.length === 0) { setError('Only image files (JPG, PNG, HEIC, WebP) can be added as pages.'); return; }
    for (const file of list) {
      try {
        const bitmap = await createImageBitmap(file);
        const CAP = 1600;
        const scale = Math.min(1, CAP / Math.max(bitmap.width, bitmap.height));
        const width = Math.max(1, Math.round(bitmap.width * scale));
        const height = Math.max(1, Math.round(bitmap.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(bitmap, 0, 0, width, height);
        bitmap.close();
        const blob = await finalizeImage(canvas);
        if (blob) addPhoto(blob);
      } catch {
        setError(`"${file.name}" could not be read as an image.`);
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [addPhoto, finalizeImage]);

  const removePage = useCallback((index: number) => {
    setPages(prev => {
      const removed = prev[index];
      if (removed) URL.revokeObjectURL(removed.url);
      const next = prev.filter((_, i) => i !== index);
      pagesRef.current = next;
      return next;
    });
    setSelected(null);
  }, []);

  const movePage = useCallback((index: number, dir: -1 | 1) => {
    setPages(prev => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      pagesRef.current = next;
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setPages(prev => {
      prev.forEach(p => URL.revokeObjectURL(p.url));
      pagesRef.current = [];
      return [];
    });
    setSelected(null);
    setResult(null);
    setError(null);
  }, []);

  const selectPage = useCallback((index: number) => {
    setSelected(prev => prev === index ? null : index);
  }, []);

  const handleConvert = useCallback(async () => {
    if (pages.length === 0) return;
    setConverting(true);
    setError(null);
    try {
      const blobs = await Promise.all(pages.map(p => fetch(p.url).then(r => r.blob())));
      const pdf = await scannedPagesToPdf(blobs, { pageSize });
      setResult(pdf);
      trackConversion('scan-pdf');
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setConverting(false);
    }
  }, [pages, pageSize]);

  const handleDownload = useCallback(() => {
    if (!result) return;
    downloadBlob(result, getOutputFilename('scan-pdf', '.pdf'));
  }, [result]);

  const copyLink = useCallback(async () => {
    const url = 'https://slatepdf.space/tools/scan-pdf';
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt('Copy this link:', url);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }, []);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (detectRafRef.current != null) cancelAnimationFrame(detectRafRef.current);
      streamRef.current?.getTracks().forEach(track => track.stop());
      if (pendingStreamRef.current) pendingStreamRef.current.getTracks().forEach(track => track.stop());
      pagesRef.current.forEach(p => URL.revokeObjectURL(p.url));
    };
  }, []);

  const primaryColor = '#7c3aed';
  const detectLabel =
    detectState === 'steady' ? 'Hold steady'
      : detectState === 'searching' ? 'Move the camera over a page'
        : detectState === 'found' ? 'Page detected'
          : '';

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-6">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-3">
          <ArrowLeft className="w-4 h-4" /> Back to all tools
        </Link>

        <div className="mb-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center"><Camera className="w-6 h-6" style={{ color: primaryColor }} /></div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Scan PDF</h1>
              <p className="text-muted-foreground text-sm sm:text-base">Scan documents with your camera or photos and save as PDF</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-border p-4 sm:p-6 shadow-sm">
          {/* Camera view with live page-detection overlay */}
          {cameraOn ? (
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-[4/3] w-full" style={{ touchAction: 'none' }}>
              <video ref={videoCallback} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
              <canvas ref={overlayRef} className="absolute inset-0 w-full h-full pointer-events-none" />
              {cameraBusy && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white pointer-events-none">
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <p className="text-sm font-medium">Starting camera…</p>
                </div>
              )}
              {justScan && (
                <div className="absolute inset-0 bg-white/40 border-4 border-white flex items-center justify-center pointer-events-none animate-fade-in">
                  <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center"><CheckCircle2 className="w-10 h-10 text-green-600" /></div>
                </div>
              )}
              {detectLabel && !cameraBusy && (
                <div className={`absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur pointer-events-none flex items-center gap-2 transition-colors ${detectState === 'steady' ? 'bg-green-500/90 text-white' : 'bg-black/60 text-white'}`}>
                  <ScanIcon className="w-3.5 h-3.5" />
                  {detectLabel}
                  {detectState === 'steady' && autoScan && <span className="opacity-90">· auto-scan</span>}
                </div>
              )}
              <div className="absolute top-3 right-3 flex gap-2">
                <button onClick={flipCamera} className="p-2.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors" title="Flip camera" aria-label="Flip camera">
                  <RefreshCw className="w-5 h-5" />
                </button>
                <button onClick={toggleCamera} className="p-2.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors" title="Close camera" aria-label="Close camera">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="absolute bottom-4 inset-x-0 flex items-center justify-center gap-6">
                <button onClick={() => { armedRef.current = true; void captureFull(); }} className="w-16 h-16 rounded-full bg-white text-primary shadow-lg hover:scale-105 active:scale-95 transition-transform flex items-center justify-center" title="Capture page" aria-label="Capture page">
                  <ScanLine className="w-8 h-8" style={{ color: primaryColor }} />
                </button>
              </div>
              {/* Filter + auto-scan bar */}
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-3 pt-8 pb-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex gap-1.5 rounded-xl bg-black/40 backdrop-blur p-1">
                    {FILTERS.map(f => (
                      <button
                        key={f.value}
                        onClick={() => setFilter(f.value)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${filter === f.value ? 'bg-white text-gray-900' : 'text-white/80 hover:text-white'}`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setAutoScan(a => !a)}
                    className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold transition-colors flex items-center gap-1.5 backdrop-blur ${autoScan ? 'bg-green-500/90 text-white' : 'bg-black/40 text-white/80'}`}
                    title="Auto-capture the page when it is steady"
                  >
                    <SlidersHorizontal className="w-3 h-3" /> Auto scan {autoScan ? 'on' : 'off'}
                  </button>
                </div>
              </div>
            </div>
          ) : showPhotos ? (
            <div
              onDragOver={e => e.preventDefault()}
              onDrop={async e => {
                e.preventDefault();
                const files = e.dataTransfer.files;
                if (files.length) await handleFilesSelected(files);
              }}
              className="rounded-2xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-gray-50 transition-colors p-6 sm:p-10 text-center"
            >
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-violet-50">
                  <ImagePlus className="w-8 h-8" style={{ color: primaryColor }} />
                </div>
                <div>
                  <p className="text-lg font-semibold text-foreground">Add photos as pages</p>
                  <p className="text-sm text-muted-foreground mt-1">Drop images here, paste, or choose files from your device — nothing is uploaded</p>
                </div>
                {!isMobile && <p className="text-xs text-muted-foreground">Tip: for camera scanning with auto page detection, open this page on your phone.</p>}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 text-white hover:shadow-lg active:scale-[0.98]"
                  style={{ backgroundColor: primaryColor }}
                >
                  <ImagePlus className="w-4 h-4" /> Choose images
                </button>
                <button onClick={() => setShowPhotos(false)} className="text-xs font-medium text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors">
                  Go back
                </button>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => e.target.files && handleFilesSelected(e.target.files)} />
            </div>
          ) : (
            /* Home stage: mobile = launch camera; desktop = go-open-on-phone prompt */
            isMobile ? (
              <div className="rounded-2xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-gray-50 transition-colors p-6 sm:p-10 text-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-violet-50">
                    <Camera className="w-8 h-8" style={{ color: primaryColor }} />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-foreground">Scan documents to PDF</p>
                    <p className="text-sm text-muted-foreground mt-1">Auto-detects the page, straightens it and builds a PDF — right here on your phone</p>
                  </div>
                  <div className="flex flex-col w-full sm:w-auto gap-3">
                    <button onClick={handleOpenCamera} className="w-full px-6 py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 text-white hover:shadow-lg active:scale-[0.98]" style={{ backgroundColor: primaryColor }}>
                      <Camera className="w-4 h-4" /> Open camera
                    </button>
                    <button onClick={() => setShowPhotos(true)} className="w-full px-6 py-3 rounded-xl font-medium text-sm border border-border text-foreground hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
                      <ImagePlus className="w-4 h-4" /> Add photos
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl overflow-hidden bg-gradient-to-br from-violet-600 to-violet-800 text-white p-6 sm:p-10">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                  <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0">
                    <Smartphone className="w-9 h-9" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl sm:text-2xl font-bold">Best experienced on your phone</h2>
                    <p className="text-sm text-violet-200 mt-1.5 leading-relaxed">
                      The scanner uses your phone’s camera to detect the page, straighten it and capture multiple pages —
                      everything stays on your device. Open this page on your phone to scan.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2 mt-4">
                      <button onClick={copyLink} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white text-violet-700 text-sm font-semibold hover:bg-violet-50 transition-colors">
                        {copied ? <CheckCircle2 className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
                        {copied ? 'Link copied!' : 'Copy link to send to your phone'}
                      </button>
                      <button onClick={() => setShowPhotos(true)} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/15 text-white text-sm font-medium hover:bg-white/25 transition-colors">
                        <Download className="w-4 h-4" /> Add photos from this device
                      </button>
                    </div>
                    <p className="text-xs text-violet-200/80 mt-3">slatepdf.space/tools/scan-pdf · photos you upload never leave your browser</p>
                  </div>
                </div>
              </div>
            )
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 animate-fade-in">
              <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
              <p className="text-xs text-destructive">{error}</p>
            </div>
          )}

          {fallbackMode && !error && !cameraOn && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <p className="text-xs text-amber-800">{fallbackMode}</p>
            </div>
          )}

          {/* Pages */}
          {pages.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" />{pages.length} page{pages.length > 1 ? 's' : ''} ready</h3>
                <div className="flex items-center gap-2">
                  {cameraOn && (
                    <button onClick={() => { armedRef.current = true; void captureFull(); }} className="px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-colors flex items-center gap-1.5" style={{ backgroundColor: primaryColor }}>
                      <Camera className="w-3.5 h-3.5" /> Add page
                    </button>
                  )}
                  {!cameraOn && (
                    <button onClick={() => fileInputRef.current?.click()} className="px-3 py-1.5 rounded-lg text-xs font-medium border border-border text-foreground hover:bg-gray-50 transition-colors flex items-center gap-1.5">
                      <ImagePlus className="w-3.5 h-3.5" /> Add images
                    </button>
                  )}
                  <button onClick={clearAll} className="px-3 py-1.5 rounded-lg text-xs font-medium text-destructive border border-red-200 hover:bg-red-50 transition-colors flex items-center gap-1.5">
                    <Trash2 className="w-3.5 h-3.5" /> Clear all
                  </button>
                </div>
              </div>

              {/* Selected page actions */}
              {selected !== null && (
                <div className="mb-3 p-3 bg-gray-50 rounded-xl border border-border flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground">Page {selected + 1} selected</span>
                  <div className="flex gap-2">
                    <button onClick={() => movePage(selected, -1)} disabled={selected === 0} className="p-2 rounded-lg bg-white border border-border text-foreground hover:bg-gray-50 transition-colors disabled:opacity-30" title="Move left" aria-label="Move left"><ChevronLeft className="w-4 h-4" /></button>
                    <button onClick={() => movePage(selected, 1)} disabled={selected === pages.length - 1} className="p-2 rounded-lg bg-white border border-border text-foreground hover:bg-gray-50 transition-colors disabled:opacity-30" title="Move right" aria-label="Move right"><ChevronRight className="w-4 h-4" /></button>
                    <button onClick={() => removePage(selected)} className="p-2 rounded-lg bg-red-50 border border-red-200 text-destructive hover:bg-red-100 transition-colors" title="Remove page" aria-label="Remove page"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-3">
                {pages.map((page, index) => (
                  <button
                    key={page.id}
                    onClick={() => selectPage(index)}
                    className={`relative aspect-[3/4] rounded-xl overflow-hidden bg-gray-100 border-2 transition-all ${selected === index ? 'border-primary ring-2 ring-primary/30' : 'border-transparent hover:border-gray-300'}`}
                    title={`Page ${index + 1}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={page.url} alt={`Page ${index + 1}`} className="absolute inset-0 w-full h-full object-cover" />
                    <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-medium">{index + 1}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {cameraOn && (
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5"><ScanIcon className="w-3.5 h-3.5" /> Tap the shutter or hold steady with auto-scan on to capture</span>
              <span>Tap a thumbnail to reorder or remove</span>
            </div>
          )}

          {/* Options + Convert */}
          {pages.length > 0 && !result && (
            <div className="mt-6 pt-6 border-t border-border">
              <div className="mb-4">
                <span className="text-sm font-semibold text-foreground">Page size</span>
                <div className="grid grid-cols-2 sm:flex gap-2 mt-2">
                  {PAGE_SIZES.map(size => (
                    <button
                      key={size.value}
                      onClick={() => setPageSize(size.value)}
                      className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${pageSize === size.value ? 'border-primary text-white' : 'border-border text-muted-foreground hover:text-foreground'}`}
                      style={pageSize === size.value ? { backgroundColor: primaryColor, borderColor: primaryColor } : undefined}
                    >
                      {size.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleConvert}
                disabled={converting}
                className="w-full px-6 py-4 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 text-white hover:shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: primaryColor }}
              >
                {converting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                {converting ? 'Creating PDF...' : `Convert to PDF (${pages.length} page${pages.length > 1 ? 's' : ''})`}
              </button>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="mt-6 pt-6 border-t border-border space-y-4 animate-fade-in">
              <div className="p-5 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-green-800">PDF ready</p>
                  <p className="text-sm text-green-700">Created from {pages.length} page{pages.length > 1 ? 's' : ''} · {formatBytes(result.size)}</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button onClick={handleDownload} className="flex-1 px-6 py-3 rounded-xl font-semibold text-sm text-white transition-all flex items-center justify-center gap-2 hover:shadow-lg active:scale-[0.98]" style={{ backgroundColor: primaryColor }}>
                  <FileDown className="w-4 h-4" /> Download PDF
                </button>
                <button onClick={() => { setResult(null); setSelected(null); }} className="flex-1 px-6 py-3 rounded-xl text-sm font-medium border border-border hover:bg-gray-50 transition-colors">
                  Scan another
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}