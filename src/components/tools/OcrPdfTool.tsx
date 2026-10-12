'use client';

import { useState, useCallback } from 'react';
import { ArrowLeft, Loader2, FileDown, AlertCircle, CheckCircle2, ScanText, X } from 'lucide-react';
import Link from 'next/link';
import FileUpload from '@/components/FileUpload';
import { ocrPdf, OcrResult, downloadBlob, getOutputFilename } from '@/lib/pdf-engine';
import { friendlyError } from '@/lib/errors';
import { useT, useHomeHref } from '@/i18n/I18nProvider';
import { msg } from '@/i18n/format';

const LANGUAGES = [
  { code: 'eng', name: msg('English') }, { code: 'ara', name: msg('Arabic') }, { code: 'ben', name: msg('Bengali') },
  { code: 'bul', name: msg('Bulgarian') }, { code: 'cat', name: msg('Catalan') }, { code: 'ces', name: msg('Czech') },
  { code: 'chi_sim', name: msg('Chinese (Simplified)') }, { code: 'chi_tra', name: msg('Chinese (Traditional)') },
  { code: 'hrv', name: msg('Croatian') }, { code: 'dan', name: msg('Danish') }, { code: 'nld', name: msg('Dutch') },
  { code: 'fin', name: msg('Finnish') }, { code: 'fra', name: msg('French') }, { code: 'deu', name: msg('German') },
  { code: 'ell', name: msg('Greek') }, { code: 'heb', name: msg('Hebrew') }, { code: 'hin', name: msg('Hindi') },
  { code: 'hun', name: msg('Hungarian') }, { code: 'isl', name: msg('Icelandic') }, { code: 'ind', name: msg('Indonesian') },
  { code: 'ita', name: msg('Italian') }, { code: 'jpn', name: msg('Japanese') }, { code: 'kor', name: msg('Korean') },
  { code: 'lav', name: msg('Latvian') }, { code: 'lit', name: msg('Lithuanian') }, { code: 'mlt', name: msg('Maltese') },
  { code: 'nor', name: msg('Norwegian') }, { code: 'fas', name: msg('Persian') }, { code: 'pol', name: msg('Polish') },
  { code: 'por', name: msg('Portuguese') }, { code: 'ron', name: msg('Romanian') }, { code: 'rus', name: msg('Russian') },
  { code: 'srp', name: msg('Serbian') }, { code: 'slk', name: msg('Slovak') }, { code: 'slv', name: msg('Slovenian') },
  { code: 'spa', name: msg('Spanish') }, { code: 'swe', name: msg('Swedish') }, { code: 'tgl', name: msg('Tagalog') },
  { code: 'tam', name: msg('Tamil') }, { code: 'tha', name: msg('Thai') }, { code: 'tur', name: msg('Turkish') },
  { code: 'ukr', name: msg('Ukrainian') }, { code: 'urd', name: msg('Urdu') }, { code: 'vie', name: msg('Vietnamese') },
];

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(2)} MB`;
}

export default function OcrPdfTool() {
  const t = useT();
  const homeHref = useHomeHref();
  const [files, setFiles] = useState<File[]>([]);
  const [selectedLangs, setSelectedLangs] = useState<string[]>(['eng']);
  const [langSearch, setLangSearch] = useState('');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState('');
  const [result, setResult] = useState<OcrResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggleLang = (code: string) => {
    setSelectedLangs(prev => {
      if (prev.includes(code)) return prev.filter(c => c !== code);
      if (prev.length >= 3) return prev;
      return [...prev, code];
    });
    setLangSearch('');
  };

  const removeLang = (code: string) => {
    setSelectedLangs(prev => prev.filter(c => c !== code));
  };

  const filteredLangs = LANGUAGES.filter(l =>
    l.name.toLowerCase().includes(langSearch.toLowerCase()) ||
    t(l.name).toLowerCase().includes(langSearch.toLowerCase()) ||
    l.code.toLowerCase().includes(langSearch.toLowerCase())
  );

  const handleProcess = useCallback(async () => {
    if (files.length === 0 || selectedLangs.length === 0) return;
    setProcessing(true);
    setError(null);
    setResult(null);
    setProgress(msg('Starting OCR...'));
    try {
      const res = await ocrPdf(files[0], selectedLangs, (page, total, m) => setProgress(m));
      setResult(res);
    } catch (err: any) {
      setError(friendlyError(err));
      setProgress('');
    } finally {
      setProcessing(false);
    }
  }, [files, selectedLangs]);

  const handleDownload = useCallback(() => {
    if (!result) return;
    downloadBlob(result.blob, getOutputFilename('ocr-pdf', '.pdf'));
  }, [result, files]);

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-6">
        <Link href={homeHref} className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-3">
          <ArrowLeft className="w-4 h-4" /> {t('Back to all tools')}
        </Link>

        <div className="mb-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-lime-50"><ScanText className="w-6 h-6 text-lime-500" /></div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{t('OCR PDF')}</h1>
              <p className="text-muted-foreground text-sm sm:text-base">{t('Convert scanned PDFs into selectable and searchable text')}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-border p-6 sm:p-8 shadow-sm">
          <FileUpload
            accept=".pdf"
            multiple={false}
            files={files}
            onFilesSelected={(f) => { setFiles(f); setResult(null); setError(null); setProgress(''); }}
            onRemoveFile={() => { setFiles([]); setResult(null); setProgress(''); }}
          />

          {files.length > 0 && !result && (
            <div className="mt-6 space-y-5">
              <div className="p-4 bg-gray-50 rounded-xl border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t('File')}</span>
                  <span className="text-sm font-medium text-foreground">{files[0].name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t('Size')}</span>
                  <span className="text-sm font-medium text-foreground">{formatBytes(files[0].size)}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">{t('Document language')}</label>
                <p className="text-xs text-muted-foreground mb-6">{t('Select up to 3 languages for best accuracy.')}</p>

                {selectedLangs.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-6">
                    {selectedLangs.map(code => {
                      const lang = LANGUAGES.find(l => l.code === code);
                      return (
                        <span key={code} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-medium">
                          {lang ? t(lang.name) : code}
                          <button onClick={() => removeLang(code)} className="hover:bg-primary/20 rounded-full p-0.5 transition-colors">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}

                {selectedLangs.length < 3 && (
                  <div className="relative">
                    <input type="text" value={langSearch} onChange={(e) => setLangSearch(e.target.value)}
                      placeholder={t('Search languages...')} className="w-full px-4 py-3 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                    {langSearch && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-border rounded-xl shadow-lg max-h-60 overflow-y-auto">
                        {filteredLangs.length === 0 ? (
                          <div className="px-4 py-3 text-sm text-muted-foreground">{t('No languages found')}</div>
                        ) : (
                          filteredLangs.map(lang => {
                            const isSelected = selectedLangs.includes(lang.code);
                            const isDisabled = selectedLangs.length >= 3 && !isSelected;
                            return (
                              <button key={lang.code} onClick={() => !isDisabled && !isSelected && toggleLang(lang.code)}
                                disabled={isDisabled}
                                className={`w-full px-4 py-2.5 text-left text-sm flex items-center justify-between transition-colors ${isDisabled ? 'opacity-40 cursor-not-allowed' : isSelected ? 'bg-primary/5 text-primary' : 'hover:bg-gray-50'}`}>
                                <span>{t(lang.name)}</span>
                                <span className="text-xs text-muted-foreground font-mono">{lang.code}</span>
                              </button>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-2">{t('{count}/3 selected', { count: selectedLangs.length })}{selectedLangs.length >= 3 && t(' (max reached)')}</p>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
                  <p className="text-sm text-destructive">{t(error)}</p>
                </div>
              )}

              {processing && progress && (
                <div className="p-4 bg-lime-50 border border-lime-200 rounded-xl flex items-center gap-3 animate-fade-in">
                  <Loader2 className="w-4 h-4 animate-spin text-lime-600" />
                  <p className="text-sm font-medium text-lime-800">{t(progress)}</p>
                </div>
              )}

              <button onClick={handleProcess} disabled={processing || selectedLangs.length === 0}
                className="px-8 py-3.5 rounded-xl font-semibold text-sm transition-all flex items-center gap-2 bg-lime-500 hover:bg-lime-600 text-white hover:shadow-lg hover:shadow-lime-500/25 active:scale-[0.98] disabled:opacity-50">
                {processing ? <><Loader2 className="w-4 h-4 animate-spin" /> {t('Processing OCR...')}</> : <><ScanText className="w-4 h-4" /> {t('Start OCR')}</>}
              </button>
            </div>
          )}

          {result && (
            <div className="mt-6 space-y-4 animate-fade-in">
              <div className="p-5 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-green-800">{t('OCR completed successfully')}</p>
                  <p className="text-sm text-green-700">
                    {result.pages > 1
                      ? t('Processed {pages} pages and extracted {chars} characters of text.', { pages: result.pages, chars: result.totalChars.toLocaleString() })
                      : t('Processed {pages} page and extracted {chars} characters of text.', { pages: result.pages, chars: result.totalChars.toLocaleString() })}
                  </p>
                </div>
              </div>

              <div className="p-5 bg-gray-50 rounded-xl border border-border">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t('Output file size')}</span>
                  <span className="text-lg font-bold text-foreground">{formatBytes(result.blob.size)}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={handleDownload} className="px-6 py-3 rounded-xl font-semibold text-sm bg-primary hover:bg-primary-hover text-white transition-all flex items-center gap-2">
                  <FileDown className="w-4 h-4" /> {t('Download OCR PDF')}
                </button>
                <button onClick={() => setResult(null)} className="px-6 py-3 rounded-xl text-sm font-medium border border-border hover:bg-gray-50 transition-colors">
                  {t('Process Another')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
