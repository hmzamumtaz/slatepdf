'use client';

import { useState, useCallback } from 'react';
import { ArrowLeft, Loader2, AlertCircle, CheckCircle2, Eye, GitCompareArrows } from 'lucide-react';
import Link from 'next/link';
import FileUpload from '@/components/FileUpload';
import { comparePdfs } from '@/lib/pdf-engine';
import type { CompareResult } from '@/lib/pdf-engine';
import { friendlyError } from '@/lib/errors';
import { useT } from '@/i18n/I18nProvider';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(2)} MB`;
}

export default function ComparePdfTool() {
  const t = useT();
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CompareResult | null>(null);

  const handleCompare = useCallback(async () => {
    if (files.length < 2) return;
    setProcessing(true);
    setError(null);
    setResult(null);
    try {
      const res = await comparePdfs(files[0], files[1]);
      setResult(res);
    } catch (err: any) {
      setError(friendlyError(err));
    } finally {
      setProcessing(false);
    }
  }, [files]);

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-6">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-3">
          <ArrowLeft className="w-4 h-4" /> {t('Back to all tools')}
        </Link>

        <div className="mb-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-blue-50"><GitCompareArrows className="w-6 h-6 text-blue-500" /></div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t('Compare PDF')}</h1>
              <p className="text-muted-foreground text-sm sm:text-base">{t('Compare two PDFs and see the differences')}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-border p-6 sm:p-8 shadow-sm">
          <FileUpload
            accept=".pdf"
            multiple
            files={files}
            onFilesSelected={(f) => { setFiles(f.slice(0, 2)); setResult(null); setError(null); }}
            onRemoveFile={(idx) => setFiles((prev) => prev.filter((_, i) => i !== idx))}
          />

          {files.length >= 2 && !result && (
            <div className="mt-6 space-y-5">
              <div className="grid sm:grid-cols-2 gap-3">
                {files.slice(0, 2).map((f, i) => (
                  <div key={i} className="p-4 bg-gray-50 rounded-xl border border-border space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground">{i === 0 ? t('Original') : t('Changed')}</p>
                    <p className="text-sm font-medium text-foreground">{f.name}</p>
                    <p className="text-xs text-muted-foreground">{formatBytes(f.size)}</p>
                  </div>
                ))}
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
                  <p className="text-sm text-destructive">{t(error)}</p>
                </div>
              )}

              <button onClick={handleCompare} disabled={processing || files.length < 2}
                className="px-8 py-3.5 rounded-xl font-semibold text-sm transition-all flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white hover:shadow-lg hover:shadow-blue-500/25 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed">
                {processing ? <><Loader2 className="w-4 h-4 animate-spin" /> {t('Comparing...')}</> : <><Eye className="w-4 h-4" /> {t('Compare PDFs')}</>}
              </button>
            </div>
          )}

          {result && (
            <div className="mt-6 space-y-4 animate-fade-in">
              <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                <p className="text-sm text-green-800">
                  <span className="font-semibold">{t('Comparison complete')}</span> — {result.identical ? t('Files are identical') : result.differingPages.length !== 1 ? t('{count} pages differ', { count: result.differingPages.length }) : t('{count} page differ', { count: result.differingPages.length })}
                  {` (${t('similarity: {value}%', { value: Math.min(100, Math.max(0, Math.round(result.textSimilarity))) })})`}
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                {[result.file1, result.file2].map((f, i) => (
                  <div key={i} className="p-4 bg-gray-50 rounded-xl border border-border space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground">{i === 0 ? t('File 1') : t('File 2')}</p>
                    <p className="text-sm font-medium text-foreground">{f.name}</p>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p>{t('Pages: {pages} | Size: {size}', { pages: f.pages, size: formatBytes(f.fileSize) })}</p>
                      {f.title && <p>{t('Title: {value}', { value: f.title })}</p>}
                      {f.author && <p>{t('Author: {value}', { value: f.author })}</p>}
                      {f.creator && <p>{t('Creator: {value}', { value: f.creator })}</p>}
                    </div>
                  </div>
                ))}
              </div>

              {!result.identical && result.differingPages.length > 0 && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="text-sm font-semibold text-amber-800 mb-2">{t('Differing pages')}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {result.differingPages.map(pg => (
                      <span key={pg} className="px-2.5 py-1 bg-white border border-amber-200 rounded-lg text-xs font-medium text-amber-700">{t('Page {page}', { page: pg })}</span>
                    ))}
                  </div>
                </div>
              )}

              <button onClick={() => { setResult(null); setFiles([]); }}
                className="px-5 py-2.5 rounded-xl text-sm font-medium border border-border hover:bg-gray-50 transition-colors">
                {t('Compare Another')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
