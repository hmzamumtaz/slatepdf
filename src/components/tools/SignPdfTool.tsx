'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { ArrowLeft, Loader2, AlertCircle, CheckCircle2, FileDown, PenTool, Type, Upload, AlertTriangle, X, FileImage, Eye, Download, RefreshCw, ZoomIn, ZoomOut } from 'lucide-react';
import Link from 'next/link';
import { Dancing_Script } from 'next/font/google';
import FileUpload from '@/components/FileUpload';
import { readFileAsArrayBuffer, downloadBlob, getOutputFilename, getPdfJs, scanPdfForSigning, signPdfWithImage } from '@/lib/pdf-engine';
import type { SignPageScan } from '@/lib/pdf-engine';
import { friendlyError } from '@/lib/errors';
import { renderTextSignature, trimCanvas, canvasToPngBytes } from '@/lib/signature-render';

const dancingScript = Dancing_Script({ subsets: ['latin'], weight: '700' });

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(2)} MB`;
}

type SigMode = 'draw' | 'type' | 'image';

export default function SignPdfTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [pages, setPages] = useState<SignPageScan[]>([]);
  const [loadingPages, setLoadingPages] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

  const [sigMode, setSigMode] = useState<SigMode>('draw');
  const [typeValue, setTypeValue] = useState('');
  const [typeFontFamily] = useState('Dancing Script');
  const [typeFontSize, setTypeFontSize] = useState(48);
  const [typeColor, setTypeColor] = useState('#000000');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  const [selectedPage, setSelectedPage] = useState<number | null>(null);
  const [signaturePlacement, setSignaturePlacement] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [sigScale, setSigScale] = useState(1);

  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (files.length === 0) { setPages([]); setSelectedPage(null); return; }
    let cancelled = false;
    (async () => {
      setLoadingPages(true);
      setPageError(null);
      try {
        const scanned = await scanPdfForSigning(files[0], 20, 10, { maxPages: 200 });
        if (!cancelled) setPages(scanned);
      } catch {
        if (!cancelled) setPageError('Could not read the PDF. The file may be corrupted or encrypted.');
      } finally {
        if (!cancelled) setLoadingPages(false);
      }
    })();
    return () => { cancelled = true; };
  }, [files]);

  const clearDrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  }, []);

  useEffect(() => {
    if (sigMode !== 'draw') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = 400;
    canvas.height = 150;
    clearDrawCanvas();
  }, [sigMode, clearDrawCanvas]);

  const getPointerPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: (e.clientX - rect.left) * (canvas.width / rect.width), y: (e.clientY - rect.top) * (canvas.height / rect.height) };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    setIsDrawing(true);
    setHasDrawn(true);
    const pos = getPointerPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pos = getPointerPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const handlePointerUp = () => setIsDrawing(false);

  const signaturePngBytes = useMemo(async (): Promise<Uint8Array | null> => {
    if (sigMode === 'draw') {
      if (!hasDrawn || !canvasRef.current) return null;
      const trimmed = trimCanvas(canvasRef.current);
      const buf = await canvasToPngBytes(trimmed);
      return new Uint8Array(buf);
    }
    if (sigMode === 'type' && typeValue.trim()) {
      const canvas = await renderTextSignature(typeValue, { fontFamily: typeFontFamily, fontSize: typeFontSize, color: typeColor });
      if (!canvas) return null;
      const trimmed = trimCanvas(canvas);
      const buf = await canvasToPngBytes(trimmed);
      return new Uint8Array(buf);
    }
    if (sigMode === 'image' && uploadedImage) {
      const resp = await fetch(uploadedImage);
      const blob = await resp.blob();
      return new Uint8Array(await blob.arrayBuffer());
    }
    return null;
  }, [sigMode, hasDrawn, typeValue, typeFontFamily, typeFontSize, typeColor, uploadedImage]);

  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const bytes = await signaturePngBytes;
      if (cancelled) return;
      if (bytes) {
        const blob = new Blob([new Uint8Array(bytes)], { type: 'image/png' });
        setPreviewDataUrl(URL.createObjectURL(blob));
      } else {
        setPreviewDataUrl(null);
      }
    })();
    return () => { cancelled = true; };
  }, [signaturePngBytes]);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setUploadedImage(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  }, []);

  const canSign = useMemo(() => {
    if (!selectedPage || !signaturePlacement) return false;
    if (sigMode === 'draw') return hasDrawn;
    if (sigMode === 'type') return typeValue.trim().length > 0;
    if (sigMode === 'image') return !!uploadedImage;
    return false;
  }, [selectedPage, signaturePlacement, sigMode, hasDrawn, typeValue, uploadedImage]);

  const handleSign = useCallback(async () => {
    if (!files.length || !selectedPage || !signaturePlacement || !canSign) return;
    setProcessing(true);
    setError(null);
    try {
      const pngBytes = await signaturePngBytes;
      if (!pngBytes) throw new Error('Could not render signature');
      const blob = await signPdfWithImage(files[0], selectedPage, pngBytes, signaturePlacement, sigScale);
      downloadBlob(blob, getOutputFilename('sign-pdf', '-signed.pdf'));
    } catch (err: any) {
      setError(friendlyError(err));
    } finally {
      setProcessing(false);
      setProgress('');
    }
  }, [files, selectedPage, signaturePlacement, sigScale, canSign, signaturePngBytes]);

  const handlePageClick = (e: React.MouseEvent<HTMLDivElement>, pageIdx: number) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setSelectedPage(pageIdx);
    setSignaturePlacement({ x: Math.max(5, Math.min(85, x - 7.5)), y: Math.max(5, Math.min(90, y - 2.5)), width: 15, height: 5 });
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to all tools
        </Link>

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-indigo-50"><PenTool className="w-6 h-6 text-indigo-500" /></div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Sign PDF</h1>
              <p className="text-muted-foreground text-sm sm:text-base">Add your signature to a PDF document — draw, type, or upload an image</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-border p-6 sm:p-8 shadow-sm space-y-6">
          <FileUpload
            accept=".pdf"
            multiple={false}
            files={files}
            onFilesSelected={(f) => { setFiles(f); setPages([]); setSelectedPage(null); setSignaturePlacement(null); setError(null); }}
            onRemoveFile={() => { setFiles([]); setPages([]); setSelectedPage(null); setSignaturePlacement(null); }}
          />

          {files.length > 0 && (
            <div className="p-4 bg-gray-50 rounded-xl border border-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">File</span>
                <span className="text-sm font-medium text-foreground">{files[0].name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Pages</span>
                <span className="text-sm font-medium text-foreground">{pages.length || '...'}</span>
              </div>
            </div>
          )}

          {/* Signature mode tabs */}
          {files.length > 0 && (
            <div>
              <label className="block text-sm font-semibold text-foreground mb-3">Create your signature</label>
              <div className="flex gap-2 mb-4">
                {([['draw', 'Draw', PenTool], ['type', 'Type', Type], ['image', 'Image', FileImage]] as const).map(([mode, label, Icon]) => (
                  <button key={mode} onClick={() => setSigMode(mode)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${sigMode === mode ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-border text-muted-foreground hover:border-gray-300'}`}>
                    <Icon className="w-4 h-4" /> {label}
                  </button>
                ))}
              </div>

              {sigMode === 'draw' && (
                <div className="space-y-3">
                  <div className="border-2 border-dashed border-border rounded-xl p-2 bg-white">
                    <canvas ref={canvasRef} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}
                      className="w-full cursor-crosshair touch-none" style={{ height: 150 }} />
                  </div>
                  <button onClick={clearDrawCanvas} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5">
                    <RefreshCw className="w-3 h-3" /> Clear canvas
                  </button>
                </div>
              )}

              {sigMode === 'type' && (
                <div className="space-y-3">
                  <input type="text" value={typeValue} onChange={(e) => setTypeValue(e.target.value)} placeholder="Type your full name"
                    className="w-full px-4 py-3 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <label className="block text-xs text-muted-foreground mb-1">Font size</label>
                      <input type="range" min={24} max={72} value={typeFontSize} onChange={(e) => setTypeFontSize(Number(e.target.value))} className="w-full accent-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Color</label>
                      <input type="color" value={typeColor} onChange={(e) => setTypeColor(e.target.value)} className="w-8 h-8 rounded border border-border cursor-pointer" />
                    </div>
                  </div>
                  {typeValue.trim() && (
                    <div className="p-4 bg-white border border-border rounded-xl text-center">
                      <p style={{ fontFamily: `'${typeFontFamily}', cursive`, fontSize: typeFontSize, color: typeColor }}>{typeValue}</p>
                    </div>
                  )}
                </div>
              )}

              {sigMode === 'image' && (
                <div className="space-y-3">
                  <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-border text-sm font-medium text-muted-foreground hover:border-indigo-300 hover:text-indigo-600 cursor-pointer transition-all">
                    <Upload className="w-4 h-4" /> Upload signature image
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                  {uploadedImage && (
                    <div className="p-4 bg-white border border-border rounded-xl flex items-center justify-center">
                      <img src={uploadedImage} alt="Signature" className="max-h-24 object-contain" />
                    </div>
                  )}
                </div>
              )}

              {previewDataUrl && (
                <div className="mt-4 p-3 bg-white border border-border rounded-xl flex items-center gap-3">
                  <Eye className="w-4 h-4 text-muted-foreground" />
                  <img src={previewDataUrl} alt="Signature preview" className="h-10 object-contain" />
                  <span className="text-xs text-muted-foreground">Preview of your signature</span>
                </div>
              )}
            </div>
          )}

          {/* Page selection */}
          {pages.length > 0 && (
            <div>
              <label className="block text-sm font-semibold text-foreground mb-3">Select a page and place your signature</label>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                {pages.map((p) => (
                  <button key={p.page} onClick={() => { setSelectedPage(p.page); setSignaturePlacement(null); }}
                    className={`relative rounded-xl overflow-hidden border-2 transition-all ${selectedPage === p.page ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-border hover:border-gray-300'}`}>
                    <img src={p.url} alt={`Page ${p.page}`} className="w-full h-auto block" />
                    <div className="absolute bottom-0 left-0 right-0 py-1 px-1.5 bg-gradient-to-t from-black/60 to-transparent">
                      <span className="text-[10px] font-medium text-white">Page {p.page}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Placement preview on selected page */}
          {selectedPage && signaturePlacement && previewDataUrl && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-foreground">Position & size</label>
                <div className="flex items-center gap-2">
                  <button onClick={() => setSigScale(s => Math.max(0.5, s - 0.1))} className="p-1.5 rounded-lg border border-border hover:bg-gray-50"><ZoomOut className="w-4 h-4" /></button>
                  <span className="text-xs text-muted-foreground w-12 text-center">{Math.round(sigScale * 100)}%</span>
                  <button onClick={() => setSigScale(s => Math.min(2, s + 0.1))} className="p-1.5 rounded-lg border border-border hover:bg-gray-50"><ZoomIn className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="relative border border-border rounded-xl overflow-hidden bg-white cursor-crosshair"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = ((e.clientX - rect.left) / rect.width) * 100;
                  const y = ((e.clientY - rect.top) / rect.height) * 100;
                  setSignaturePlacement(prev => prev ? { ...prev, x: Math.max(0, Math.min(85, x - 7.5)), y: Math.max(0, Math.min(90, y - 2.5)) } : null);
                }}>
                <img src={pages.find(p => p.page === selectedPage)?.url || ''} alt={`Page ${selectedPage}`} className="w-full h-auto block" />
                <img src={previewDataUrl} alt="Signature"
                  className="absolute pointer-events-none"
                  style={{
                    left: `${signaturePlacement.x}%`,
                    top: `${signaturePlacement.y}%`,
                    height: `${signaturePlacement.height * sigScale}%`,
                    maxWidth: '40%',
                    objectFit: 'contain',
                  }} />
              </div>
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {processing && progress && (
            <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center gap-3 animate-fade-in">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
              <p className="text-sm font-medium text-indigo-800">{progress}</p>
            </div>
          )}

          {files.length > 0 && (
            <button onClick={handleSign} disabled={processing || !canSign}
              className="px-8 py-3.5 rounded-xl font-semibold text-sm transition-all flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white hover:shadow-lg hover:shadow-indigo-500/25 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed">
              {processing ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing...</> : <><Download className="w-4 h-4" /> Sign & Download PDF</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
