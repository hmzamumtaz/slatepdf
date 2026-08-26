'use client';

import { useState, useCallback, useEffect } from 'react';
import { ArrowLeft, Loader2, AlertCircle, CheckCircle2, FileDown, Scissors, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import FileUpload from '@/components/FileUpload';
import { readFileAsArrayBuffer, loadPdf, redactPdf, downloadBlob, getOutputFilename, getPdfJs } from '@/lib/pdf-engine';
import { friendlyError } from '@/lib/errors';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(2)} MB`;
}

interface PageThumb {
  pageIndex: number;
  dataUrl: string;
  width: number;
  height: number;
}

export default function RedactPdfTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [thumbs, setThumbs] = useState<PageThumb[]>([]);
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
  const [loadingThumbs, setLoadingThumbs] = useState(false);
  const [thumbError, setThumbError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ size: number; removed: number } | null>(null);

  useEffect(() => {
    if (files.length === 0) { setThumbs([]); setSelectedPages(new Set()); return; }
    let cancelled = false;
    (async () => {
      setLoadingThumbs(true);
      setThumbError(null);
      try {
        const arrayBuffer = await readFileAsArrayBuffer(files[0]);
        const pdfjsLib = await getPdfJs();
        const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
        const pageThumbs: PageThumb[] = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          if (cancelled) return;
          const page = await pdf.getPage(i);
          const scale = 150 / page.getViewport({ scale: 1 }).width;
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          await page.render({ canvasContext: canvas.getContext('2d') as any, viewport, canvas }).promise;
          pageThumbs.push({ pageIndex: i, dataUrl: canvas.toDataURL('image/png'), width: viewport.width, height: viewport.height });
        }
        if (!cancelled) setThumbs(pageThumbs);
      } catch {
        if (!cancelled) setThumbError('Could not render thumbnails. The file may be corrupted.');
      } finally {
        if (!cancelled) setLoadingThumbs(false);
      }
    })();
    return () => { cancelled = true; };
  }, [files]);

  const togglePage = (pageIndex: number) => {
    setSelectedPages(prev => {
      const next = new Set(prev);
      if (next.has(pageIndex)) next.delete(pageIndex); else next.add(pageIndex);
      return next;
    });
  };

  const handleRedact = useCallback(async () => {
    if (files.length === 0 || selectedPages.size === 0) return;
    setProcessing(true);
    setError(null);
    setResult(null);
    try {
      const arrayBuffer = await readFileAsArrayBuffer(files[0]);
      const pdfjsLib = await getPdfJs();
      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
      const redactions: { x: number; y: number; width: number; height: number; pageIndex: number }[] = [];

      for (const pageNum of selectedPages) {
        const page = await pdf.getPage(pageNum);
        const vp = page.getViewport({ scale: 1 });
        redactions.push({ x: 0, y: 0, width: vp.width, height: vp.height, pageIndex: pageNum - 1 });
      }

      const blob = await redactPdf(files[0], redactions);
      downloadBlob(blob, getOutputFilename('redact-pdf', '-redacted.pdf'));
      setResult({ size: blob.size, removed: selectedPages.size });
      setSelectedPages(new Set());
    } catch (err: any) {
      setError(friendlyError(err));
    } finally {
      setProcessing(false);
      setProgress('');
    }
  }, [files, selectedPages]);

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to all tools
        </Link>

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-red-50"><Scissors className="w-6 h-6 text-red-500" /></div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Redact PDF</h1>
              <p className="text-muted-foreground text-sm sm:text-base">Permanently remove pages from your PDF document</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-border p-6 sm:p-8 shadow-sm">
          <FileUpload
            accept=".pdf"
            multiple={false}
            files={files}
            onFilesSelected={(f) => { setFiles(f); setResult(null); setError(null); }}
            onRemoveFile={() => { setFiles([]); setThumbs([]); setSelectedPages(new Set()); }}
          />

          {files.length > 0 && !result && (
            <div className="mt-6 space-y-5">
              <div className="p-4 bg-gray-50 rounded-xl border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">File</span>
                  <span className="text-sm font-medium text-foreground">{files[0].name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Pages</span>
                  <span className="text-sm font-medium text-foreground">{thumbs.length || '...'}</span>
                </div>
              </div>

              <div className="p-3 bg-red-50/60 border border-red-200 rounded-xl flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <p className="text-xs text-red-800 leading-relaxed">
                  Redaction permanently removes the selected pages from the PDF. Only use this on documents you own or have permission to modify.
                </p>
              </div>

              {loadingThumbs && (
                <div className="flex items-center justify-center py-12 gap-3 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin" /> Rendering page thumbnails...
                </div>
              )}

              {thumbError && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                  <p className="text-sm text-amber-800">{thumbError}</p>
                </div>
              )}

              {!loadingThumbs && !thumbError && thumbs.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-foreground mb-3">Click pages to select for redaction ({selectedPages.size} selected)</p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                    {thumbs.map((t) => (
                      <button key={t.pageIndex} onClick={() => togglePage(t.pageIndex)}
                        className={`relative rounded-xl overflow-hidden border-2 transition-all group ${selectedPages.has(t.pageIndex) ? 'border-red-500 ring-2 ring-red-500/20 bg-red-50/30' : 'border-border hover:border-gray-300'}`}>
                        <img src={t.dataUrl} alt={`Page ${t.pageIndex}`} className="w-full h-auto block" />
                        <div className={`absolute inset-0 transition-colors ${selectedPages.has(t.pageIndex) ? 'bg-red-500/20' : 'group-hover:bg-black/5'}`} />
                        <div className="absolute bottom-0 left-0 right-0 py-1 px-1.5 bg-gradient-to-t from-black/60 to-transparent">
                          <span className="text-[10px] font-medium text-white">{t.pageIndex}</span>
                        </div>
                        {selectedPages.has(t.pageIndex) && (
                          <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
                            <Scissors className="w-2.5 h-2.5 text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              {processing && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 animate-fade-in">
                  <Loader2 className="w-4 h-4 animate-spin text-red-600" />
                  <p className="text-sm font-medium text-red-800">Redacting pages...</p>
                </div>
              )}

              <button onClick={handleRedact} disabled={processing || selectedPages.size === 0}
                className="px-8 py-3.5 rounded-xl font-semibold text-sm transition-all flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white hover:shadow-lg hover:shadow-red-500/25 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed">
                {processing ? <><Loader2 className="w-4 h-4 animate-spin" /> Redacting...</> : <><Scissors className="w-4 h-4" /> Redact {selectedPages.size} page{selectedPages.size !== 1 ? 's' : ''}</>}
              </button>
            </div>
          )}

          {result && (
            <div className="mt-6 space-y-4 animate-fade-in">
              <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                <p className="text-sm text-green-800"><span className="font-semibold">PDF redacted</span> — {result.removed} page{result.removed !== 1 ? 's' : ''} removed ({formatBytes(result.size)}).</p>
              </div>
              <button onClick={() => { setResult(null); setFiles([]); setThumbs([]); setSelectedPages(new Set()); }}
                className="px-5 py-2.5 rounded-xl text-sm font-medium border border-border hover:bg-gray-50 transition-colors">
                Redact Another
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
