'use client';

import { useState, useCallback } from 'react';
import { ArrowLeft, Loader2, AlertCircle, CheckCircle2, Shuffle, FileDown } from 'lucide-react';
import Link from 'next/link';
import FileUpload from '@/components/FileUpload';
import { alternateMixPdfs, downloadBlob, getOutputFilename } from '@/lib/pdf-engine';
import { friendlyError } from '@/lib/errors';
import { useT, useHomeHref } from '@/i18n/I18nProvider';
import ToolTrustChips from '@/components/ToolTrustChips';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(2)} MB`;
}

export default function AlternateMixTool() {
  const t = useT();
  const homeHref = useHomeHref();
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleMix = useCallback(async () => {
    if (files.length < 2) return;
    setProcessing(true);
    setError(null);
    setDone(false);
    try {
      const blob = await alternateMixPdfs(files[0], files[1]);
      downloadBlob(blob, getOutputFilename('alternate-mix', '.pdf'));
      setDone(true);
    } catch (err: unknown) {
      setError(friendlyError(err));
    } finally {
      setProcessing(false);
    }
  }, [files]);

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-6">
        <Link href={homeHref} className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-3">
          <ArrowLeft className="w-4 h-4" /> {t('Back to all tools')}
        </Link>

        <div className="mb-6">
          <div className="flex items-start gap-4 mb-3">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-teal-50"><Shuffle className="w-7 h-7 text-teal-500" /></div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">{t('Alternate & Mix')}</h1>
              <p className="text-muted-foreground text-sm sm:text-base mt-1">{t('Interleave the pages of two PDFs, one after the other')}</p>
            </div>
          </div>
          <ToolTrustChips />
        </div>

        <div className="bg-white rounded-2xl border border-border p-6 sm:p-8 shadow-sm">
          <FileUpload
            accept=".pdf"
            multiple
            files={files}
            onFilesSelected={(f) => { setFiles(f.slice(0, 2)); setDone(false); setError(null); }}
            onRemoveFile={(idx) => setFiles((prev) => prev.filter((_, i) => i !== idx))}
          />

          {files.length >= 2 && (
            <div className="mt-6 space-y-5">
              <div className="grid sm:grid-cols-2 gap-3">
                {files.slice(0, 2).map((f, i) => (
                  <div key={i} className="p-4 bg-gray-50 rounded-xl border border-border space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground">{i === 0 ? t('First document') : t('Second document')}</p>
                    <p className="text-sm font-medium text-foreground">{f.name}</p>
                    <p className="text-xs text-muted-foreground">{formatBytes(f.size)}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">{t('The result goes page 1 of the first document, page 1 of the second, page 2 of the first, page 2 of the second, and so on. If one document is longer, its remaining pages go at the end.')}</p>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
                  <p className="text-sm text-destructive">{t(error)}</p>
                </div>
              )}

              {done && !processing && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3 animate-fade-in">
                  <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                  <p className="text-sm text-green-800"><span className="font-semibold">{t('Mixed PDF downloaded')}</span>.</p>
                </div>
              )}

              <button onClick={handleMix} disabled={processing || files.length < 2}
                className="px-8 py-3.5 rounded-xl font-semibold text-sm transition-all flex items-center gap-2 bg-teal-500 hover:bg-teal-600 text-white hover:shadow-lg hover:shadow-teal-500/25 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed">
                {processing ? <><Loader2 className="w-4 h-4 animate-spin" /> {t('Mixing...')}</> : <><FileDown className="w-4 h-4" /> {t('Mix PDFs')}</>}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
