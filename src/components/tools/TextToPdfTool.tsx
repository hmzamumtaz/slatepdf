'use client';

import { useState, useCallback } from 'react';
import { ArrowLeft, Loader2, AlertCircle, CheckCircle2, FileDown, Type } from 'lucide-react';
import Link from 'next/link';
import { createPdfFromText, downloadBlob, getOutputFilename } from '@/lib/pdf-engine';
import { friendlyError } from '@/lib/errors';
import { useT, useHomeHref } from '@/i18n/I18nProvider';
import ToolTrustChips from '@/components/ToolTrustChips';

export default function TextToPdfTool() {
  const t = useT();
  const homeHref = useHomeHref();
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultSize, setResultSize] = useState<number | null>(null);

  const handleConvert = useCallback(async () => {
    if (!text.trim()) { setError('Type or paste some text first.'); return; }
    setProcessing(true);
    setError(null);
    setResultSize(null);
    try {
      const blob = await createPdfFromText(text, title.trim() || undefined);
      downloadBlob(blob, getOutputFilename('text-to-pdf', '.pdf'));
      setResultSize(blob.size);
    } catch (err: unknown) {
      setError(friendlyError(err));
    } finally {
      setProcessing(false);
    }
  }, [text, title]);

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-6">
        <Link href={homeHref} className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-3">
          <ArrowLeft className="w-4 h-4" /> {t('Back to all tools')}
        </Link>

        <div className="mb-6">
          <div className="flex items-start gap-4 mb-3">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-blue-50"><Type className="w-7 h-7 text-blue-500" /></div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">{t('Text to PDF')}</h1>
              <p className="text-muted-foreground text-sm sm:text-base mt-1">{t('Turn plain text into a PDF document')}</p>
            </div>
          </div>
          <ToolTrustChips />
        </div>

        <div className="bg-white rounded-2xl border border-border p-6 sm:p-8 shadow-sm space-y-5">
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">{t('Document title (optional)')}</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('My document')}
              className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">{t('Your text')}</label>
            <textarea
              value={text}
              onChange={(e) => { setText(e.target.value); setResultSize(null); }}
              rows={16}
              className="w-full px-4 py-3 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-y"
              placeholder={t('Type or paste your text here...')}
            />
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
              <p className="text-sm text-destructive">{t(error)}</p>
            </div>
          )}

          {resultSize !== null && !processing && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3 animate-fade-in">
              <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
              <p className="text-sm text-green-800"><span className="font-semibold">{t('PDF downloaded')}</span>.</p>
            </div>
          )}

          <button onClick={handleConvert} disabled={processing || !text.trim()}
            className="px-8 py-3.5 rounded-xl font-semibold text-sm transition-all flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white hover:shadow-lg hover:shadow-blue-500/25 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed">
            {processing ? <><Loader2 className="w-4 h-4 animate-spin" /> {t('Converting...')}</> : <><FileDown className="w-4 h-4" /> {t('Convert to PDF')}</>}
          </button>
        </div>
      </div>
    </div>
  );
}
