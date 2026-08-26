'use client';

import { useState, useCallback } from 'react';
import { ArrowLeft, Loader2, AlertCircle, CheckCircle2, FileDown, BookOpen, Palette, Type } from 'lucide-react';
import Link from 'next/link';
import { epubToPdf, downloadBlob, getOutputFilename } from '@/lib/pdf-engine';
import { friendlyError } from '@/lib/errors';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(2)} MB`;
}

export default function EpubToPdfTool() {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<'visual' | 'text'>('visual');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [resultSize, setResultSize] = useState<number | null>(null);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setResultSize(null);
    setError(null);
    e.target.value = '';
  }, []);

  const handleConvert = useCallback(async () => {
    if (!file) { setError('Upload an EPUB file first.'); return; }
    setProcessing(true);
    setError(null);
    setResultSize(null);
    setProgress('Extracting EPUB content...');
    try {
      const blob = await epubToPdf(file, mode);
      downloadBlob(blob, getOutputFilename('epub-to-pdf', '.pdf'));
      setResultSize(blob.size);
    } catch (err: unknown) {
      setError(friendlyError(err));
    } finally {
      setProcessing(false);
      setProgress('');
    }
  }, [file, mode]);

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-6">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-3">
          <ArrowLeft className="w-4 h-4" /> Back to all tools
        </Link>

        <div className="mb-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-orange-50"><BookOpen className="w-6 h-6 text-orange-500" /></div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">EPUB to PDF</h1>
              <p className="text-muted-foreground text-sm sm:text-base">Convert EPUB ebooks to PDF documents</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-border p-6 sm:p-8 shadow-sm space-y-5">
          {/* File upload */}
          <div>
            <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-border text-sm font-medium text-muted-foreground hover:border-primary hover:text-primary cursor-pointer transition-all">
              <FileDown className="w-4 h-4 rotate-180" /> {file ? file.name : 'Upload .epub file'}
              <input type="file" accept=".epub" onChange={handleFileUpload} className="hidden" />
            </label>
            {file && (
              <p className="mt-2 text-xs text-muted-foreground">{formatBytes(file.size)}</p>
            )}
          </div>

          {/* Output mode */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">PDF output</label>
            <div className="grid sm:grid-cols-2 gap-3">
              <button onClick={() => setMode('visual')} className={`text-left p-4 rounded-xl border-2 transition-all ${mode === 'visual' ? 'border-primary bg-primary/5' : 'border-border hover:border-gray-300'}`}>
                <div className="flex items-center gap-2 mb-1"><Palette className={`w-4 h-4 ${mode === 'visual' ? 'text-primary' : 'text-muted-foreground'}`} /><span className="text-sm font-semibold">Exact design</span></div>
                <p className="text-xs text-muted-foreground">Preserves the original layout, fonts, and CSS styling of the ebook. Best for illustrated and designed books.</p>
              </button>
              <button onClick={() => setMode('text')} className={`text-left p-4 rounded-xl border-2 transition-all ${mode === 'text' ? 'border-primary bg-primary/5' : 'border-border hover:border-gray-300'}`}>
                <div className="flex items-center gap-2 mb-1"><Type className={`w-4 h-4 ${mode === 'text' ? 'text-primary' : 'text-muted-foreground'}`} /><span className="text-sm font-semibold">Selectable text</span></div>
                <p className="text-xs text-muted-foreground">Extracts the text content and reflows it into a clean, searchable PDF. Best for novels and text-heavy books.</p>
              </button>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {processing && progress && (
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl flex items-center gap-3 animate-fade-in">
              <Loader2 className="w-4 h-4 animate-spin text-orange-600" />
              <p className="text-sm font-medium text-orange-800">{progress}</p>
            </div>
          )}

          {resultSize !== null && !processing && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3 animate-fade-in">
              <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
              <p className="text-sm text-green-800"><span className="font-semibold">PDF downloaded</span> ({formatBytes(resultSize)}).</p>
            </div>
          )}

          <button onClick={handleConvert} disabled={processing || !file}
            className="px-8 py-3.5 rounded-xl font-semibold text-sm transition-all flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white hover:shadow-lg hover:shadow-orange-500/25 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed">
            {processing ? <><Loader2 className="w-4 h-4 animate-spin" /> Converting...</> : <><FileDown className="w-4 h-4" /> Convert to PDF</>}
          </button>
        </div>
      </div>
    </div>
  );
}
