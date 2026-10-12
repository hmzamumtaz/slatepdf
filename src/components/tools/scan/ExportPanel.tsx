'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Eye, EyeOff, FileDown, Loader2, Lock, Share2, Wand2 } from 'lucide-react';
import { scannedPagesToPdf, downloadBlob, downloadBlobsAsZip, protectPdf, type ScanPdfOptions } from '@/lib/pdf-engine';
import { addScan } from '@/lib/scan-library';
import { friendlyError } from '@/lib/errors';
import { trackConversion } from '@/lib/stats';
import { useT, useToolHref } from '@/i18n/I18nProvider';
import { msg } from '@/i18n/format';
import { pageForExport, QUALITY_SETTINGS, type ScanPage, type ScanQuality } from '@/lib/scan-session';

const PAGE_SIZES: { label: string; value: NonNullable<ScanPdfOptions['pageSize']> }[] = [
  { label: msg('Fit page'), value: 'original' },
  { label: msg('A4'), value: 'a4' },
  { label: msg('Letter'), value: 'letter' },
  { label: msg('Legal'), value: 'legal' },
  { label: msg('A4 landscape'), value: 'a4-landscape' },
  { label: msg('Letter landscape'), value: 'letter-landscape' },
];

type ExportFormat = 'pdf' | 'jpg';

const MIN_PASSWORD = 4;

interface ExportResult {
  format: ExportFormat;
  /** The PDF, or the single JPG. */
  blob: Blob | null;
  /** Every page as a JPG file (JPG export only). */
  images: File[];
  size: number;
  searchable: boolean;
  locked: boolean;
  /** Whether a copy was kept in Recent scans on this device. */
  stored: boolean;
}

export const OCR_LANGUAGES: { code: string; name: string }[] = [
  { code: 'eng', name: msg('English') },
  { code: 'spa', name: msg('Spanish') },
  { code: 'fra', name: msg('French') },
  { code: 'deu', name: msg('German') },
  { code: 'ita', name: msg('Italian') },
  { code: 'por', name: msg('Portuguese') },
  { code: 'nld', name: msg('Dutch') },
  { code: 'tur', name: msg('Turkish') },
  { code: 'pol', name: msg('Polish') },
  { code: 'rus', name: msg('Russian') },
  { code: 'ara', name: msg('Arabic') },
  { code: 'hin', name: msg('Hindi') },
  { code: 'urd', name: msg('Urdu') },
  { code: 'ind', name: msg('Indonesian') },
  { code: 'vie', name: msg('Vietnamese') },
  { code: 'chi_sim', name: msg('Chinese (Simplified)') },
  { code: 'jpn', name: msg('Japanese') },
  { code: 'kor', name: msg('Korean') },
];

interface Props {
  pages: ScanPage[];
  docName: string;
  onDocName: (name: string) => void;
  /** Dark styling for use inside the fullscreen scanner. */
  dark?: boolean;
  onScanNew?: () => void;
  /** Called after a PDF has been created and (if storage allows) added to Recent scans. */
  onSaved?: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(2)} MB`;
}

function safeFileName(name: string): string {
  const base = name.trim().replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').slice(0, 120) || 'Scan';
  return base.toLowerCase().endsWith('.pdf') ? base : `${base}.pdf`;
}

function baseName(name: string): string {
  return safeFileName(name).replace(/\.pdf$/i, '');
}

/** A small JPEG of the first page for the Recent scans list, or null if the browser can't make one. */
async function makeThumbnail(source: Blob | null | undefined, width = 240): Promise<Blob | null> {
  if (!source) return null;
  try {
    const bitmap = await createImageBitmap(source);
    try {
      const scale = Math.min(1, width / bitmap.width);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      return await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.75));
    } finally {
      bitmap.close();
    }
  } catch {
    return null;
  }
}

export default function ExportPanel({ pages, docName, onDocName, dark, onScanNew, onSaved }: Props) {
  const t = useT();
  const toolHref = useToolHref();
  const [pageSize, setPageSize] = useState<NonNullable<ScanPdfOptions['pageSize']>>('original');
  const [quality, setQuality] = useState<ScanQuality>('medium');
  const [ocr, setOcr] = useState(true);
  const [lang, setLang] = useState('eng');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [format, setFormat] = useState<ExportFormat>('pdf');
  const [protect, setProtect] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [result, setResult] = useState<ExportResult | null>(null);
  const [resultKey, setResultKey] = useState('');

  const isPdf = format === 'pdf';
  const useOcr = isPdf && ocr;
  const useProtect = isPdf && protect;
  const passwordError = !useProtect
    ? null
    : password.length < MIN_PASSWORD
      ? t('Use at least {count} characters.', { count: MIN_PASSWORD })
      : password !== confirm
        ? t('The passwords don’t match.')
        : null;

  // A finished file only stays valid while the pages and options it was made from are unchanged.
  const key = JSON.stringify([pages.map(p => [p.id, p.url]), format, pageSize, quality, useOcr, lang, docName, useProtect, useProtect ? password : '']);
  const current = result && resultKey === key ? result : null;

  const createJpg = async () => {
    const base = baseName(docName);
    const images: File[] = [];
    for (let i = 0; i < pages.length; i++) {
      setProgress(t('Preparing page {number} of {total}…', { number: i + 1, total: pages.length }));
      const jpg = await pageForExport(pages[i], quality);
      const name = pages.length === 1 ? `${base}.jpg` : `page-${String(i + 1).padStart(2, '0')}.jpg`;
      images.push(new File([jpg], name, { type: 'image/jpeg' }));
    }
    setResult({
      format: 'jpg',
      blob: images.length === 1 ? images[0] : null,
      images,
      size: images.reduce((sum, f) => sum + f.size, 0),
      searchable: false,
      locked: false,
      stored: false,
    });
    setResultKey(key);
    trackConversion('scan-pdf');
  };

  const createPdf = async () => {
    const blobs: Blob[] = [];
    for (let i = 0; i < pages.length; i++) {
      setProgress(t('Preparing page {number} of {total}…', { number: i + 1, total: pages.length }));
      blobs.push(await pageForExport(pages[i], quality));
    }
    let pdf = await scannedPagesToPdf(blobs, {
      pageSize,
      title: docName.trim() || undefined,
      ocrLanguages: useOcr ? [lang] : undefined,
      onProgress: m => setProgress(t(m)),
      realSizeA4: pages.map(p => p.layout === 'id-card'),
    });
    if (useProtect) {
      setProgress(t('Adding the password…'));
      // Encryption wraps the finished file, so the OCR text layer stays searchable once it's opened.
      pdf = await protectPdf(new File([pdf], safeFileName(docName), { type: 'application/pdf' }), password);
    }
    setProgress(t('Saving to Recent scans…'));
    const thumb = await makeThumbnail(pages[0]?.out ?? blobs[0]);
    const stored = await addScan({
      name: docName.trim() || 'Scan',
      pages: pages.length,
      pdf,
      thumb,
      protected: useProtect,
      searchable: useOcr,
    });
    setResult({ format: 'pdf', blob: pdf, images: [], size: pdf.size, searchable: useOcr, locked: useProtect, stored: !!stored });
    setResultKey(key);
    trackConversion('scan-pdf');
    onSaved?.();
  };

  const create = async () => {
    if (passwordError) return;
    setBusy(true);
    setError(null);
    try {
      if (isPdf) await createPdf();
      else await createJpg();
    } catch (err) {
      setError(useOcr
        ? t('{error} If text recognition could not load (it needs a connection the first time), turn it off and try again.', { error: t(friendlyError(err)) })
        : t(friendlyError(err)));
    } finally {
      setBusy(false);
      setProgress('');
    }
  };

  const fileName = !current || current.format === 'pdf'
    ? safeFileName(docName)
    : current.images.length === 1 ? current.images[0].name : `${baseName(docName)}.zip`;
  const shareFiles: File[] = !current
    ? []
    : current.format === 'pdf'
      ? (current.blob ? [new File([current.blob], fileName, { type: 'application/pdf' })] : [])
      : current.images;
  let canShare = false;
  if (shareFiles.length > 0 && typeof navigator !== 'undefined' && navigator.canShare) {
    try {
      canShare = navigator.canShare({ files: shareFiles });
    } catch {
      canShare = false;
    }
  }

  const share = async () => {
    if (shareFiles.length === 0) return;
    try {
      await navigator.share({ files: shareFiles, title: docName });
    } catch {
      /* the user closed the share sheet */
    }
  };

  const download = async () => {
    if (!current) return;
    if (current.blob) {
      downloadBlob(current.blob, fileName);
      return;
    }
    try {
      await downloadBlobsAsZip(current.images.map(f => ({ blob: f, name: f.name })), fileName);
    } catch (err) {
      setError(t(friendlyError(err)));
    }
  };

  const tone = dark
    ? { label: 'text-white', muted: 'text-white/60', chip: 'border-white/15 text-white/80', input: 'bg-white/10 border-white/15 text-white placeholder:text-white/40', card: 'bg-white/5 border-white/10' }
    : { label: 'text-foreground', muted: 'text-muted-foreground', chip: 'border-border text-muted-foreground hover:text-foreground', input: 'bg-white border-border text-foreground', card: 'bg-gray-50 border-border' };
  const chip = (on: boolean) => `min-h-11 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${on ? 'bg-violet-600 border-violet-600 text-white' : tone.chip}`;

  if (current) {
    return (
      <div className="space-y-4">
        <div className={`p-4 rounded-xl border flex items-start gap-3 ${dark ? 'bg-green-500/10 border-green-500/30' : 'bg-green-50 border-green-200'}`}>
          <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className={`text-sm font-semibold ${dark ? 'text-green-300' : 'text-green-800'}`}>
              {current.format === 'pdf' ? t('PDF ready') : current.images.length === 1 ? t('JPG ready') : t('JPGs ready')}
            </p>
            <p className={`text-sm break-words ${dark ? 'text-green-200/80' : 'text-green-700'}`}>
              {fileName} · {pages.length > 1 ? t('{count} pages', { count: pages.length }) : t('{count} page', { count: pages.length })} · {formatBytes(current.size)}{current.searchable ? ` · ${t('searchable')}` : ''}{current.locked ? ` · ${t('password protected')}` : ''}
            </p>
            {current.format === 'pdf' && (
              <p className={`text-xs mt-1 ${dark ? 'text-green-200/70' : 'text-green-700/80'}`}>
                {current.stored
                  ? t('A copy is in Recent scans, stored in this browser on this device only.')
                  : t('This browser didn’t allow saving a copy on this device (private browsing can block it), so download it now.')}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button onClick={() => void download()} className="flex-1 px-6 py-3 rounded-xl font-semibold text-sm text-white bg-violet-600 flex items-center justify-center gap-2 active:scale-[0.98]">
            <FileDown className="w-4 h-4" />
            {current.format === 'pdf' ? t('Download PDF') : current.images.length === 1 ? t('Download JPG') : t('Download {count} JPGs (.zip)', { count: current.images.length })}
          </button>
          {canShare && (
            <button onClick={share} className={`flex-1 px-6 py-3 rounded-xl font-semibold text-sm border flex items-center justify-center gap-2 ${dark ? 'border-white/20 text-white' : 'border-border text-foreground'}`}>
              <Share2 className="w-4 h-4" /> {t('Share')}
            </button>
          )}
        </div>
        {error && <p className={`text-xs ${dark ? 'text-red-300' : 'text-destructive'}`}>{error}</p>}
        <p className={`text-xs ${tone.muted}`}>
          {current.format === 'pdf'
            ? <>{t('Next:')} <Link href={toolHref('sign-pdf')} className="underline">{t('sign it')}</Link>{current.locked ? '' : <>, <Link href={toolHref('protect-pdf')} className="underline">{t('add a password')}</Link></>} {t('or')} <Link href={toolHref('compress-pdf')} className="underline">{t('compress it further')}</Link>.</>
            : <>{t('Next:')} <Link href={toolHref('jpg-to-pdf')} className="underline">{t('turn images into a PDF')}</Link> {t('or')} <Link href={toolHref('compress-pdf')} className="underline">{t('compress a PDF')}</Link>.</>}
          {onScanNew && <> · <button onClick={onScanNew} className="underline">{t('Start a new scan')}</button></>}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <label className="block">
        <span className={`text-sm font-semibold ${tone.label}`}>{t('File name')}</span>
        <input value={docName} onChange={e => onDocName(e.target.value)} className={`mt-2 w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-500/40 ${tone.input}`} />
      </label>

      <div>
        <span className={`text-sm font-semibold ${tone.label}`}>{t('Format')}</span>
        <div className="grid grid-cols-2 gap-2 mt-2" role="group" aria-label={t('Format')}>
          <button onClick={() => setFormat('pdf')} aria-pressed={isPdf} className={chip(isPdf)}>PDF</button>
          <button onClick={() => setFormat('jpg')} aria-pressed={!isPdf} className={chip(!isPdf)}>JPG</button>
        </div>
        {!isPdf && (
          <p className={`text-xs mt-1.5 ${tone.muted}`}>
            {pages.length === 1 ? t('One JPG image of the page.') : t('{count} JPG images, one per page, in a .zip.', { count: pages.length })} {t('Text recognition and passwords only apply to PDFs.')}
          </p>
        )}
      </div>

      {isPdf && (
        <div>
          <span className={`text-sm font-semibold ${tone.label}`}>{t('Page size')}</span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2" role="group" aria-label={t('Page size')}>
            {PAGE_SIZES.map(s => <button key={s.value} onClick={() => setPageSize(s.value)} aria-pressed={pageSize === s.value} className={chip(pageSize === s.value)}>{t(s.label)}</button>)}
          </div>
        </div>
      )}

      <div>
        <span className={`text-sm font-semibold ${tone.label}`}>{t('File size')}</span>
        <div className="grid grid-cols-3 gap-2 mt-2">
          {(Object.keys(QUALITY_SETTINGS) as ScanQuality[]).map(q => (
            <button key={q} onClick={() => setQuality(q)} className={chip(quality === q)}>{t(QUALITY_SETTINGS[q].label)}</button>
          ))}
        </div>
        <p className={`text-xs mt-1.5 ${tone.muted}`}>{t(QUALITY_SETTINGS[quality].hint)}</p>
      </div>

      {isPdf && <div className={`rounded-xl border p-3 ${tone.card}`}>
        <label className="flex items-start gap-3">
          <input type="checkbox" checked={ocr} onChange={e => setOcr(e.target.checked)} className="mt-0.5 w-4 h-4 accent-violet-600" />
          <span>
            <span className={`block text-sm font-semibold ${tone.label}`}>{t('Recognize text (OCR)')}</span>
            <span className={`block text-xs mt-0.5 ${tone.muted}`}>{t('Makes the PDF searchable and lets you copy its text. Runs on this device; the language model downloads once (a few MB).')}</span>
          </span>
        </label>
        {ocr && (
          <select value={lang} onChange={e => setLang(e.target.value)} className={`mt-3 w-full rounded-lg border px-3 py-2 text-sm ${tone.input}`} aria-label={t('Document language')}>
            {OCR_LANGUAGES.map(l => <option key={l.code} value={l.code} className="text-gray-900">{t(l.name)}</option>)}
          </select>
        )}
      </div>}

      {isPdf && (
        <div className={`rounded-xl border p-3 ${tone.card}`}>
          <label className="flex items-start gap-3">
            <input type="checkbox" checked={protect} onChange={e => setProtect(e.target.checked)} className="mt-0.5 w-4 h-4 accent-violet-600" />
            <span>
              <span className={`flex items-center gap-1.5 text-sm font-semibold ${tone.label}`}><Lock className="w-3.5 h-3.5" /> {t('Protect with a password')}</span>
              <span className={`block text-xs mt-0.5 ${tone.muted}`}>{t('Anyone opening the PDF will need it. Encrypted on this device. There is no way to recover a forgotten password, so keep it somewhere safe.')}</span>
            </span>
          </label>
          {protect && (
            <div className="mt-3 space-y-2">
              <div className="flex gap-2">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="new-password"
                  placeholder={t('Password')}
                  aria-label={t('Password')}
                  className={`min-w-0 flex-1 rounded-lg border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-500/40 ${tone.input}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? t('Hide password') : t('Show password')}
                  aria-pressed={showPassword}
                  className={`w-11 h-11 shrink-0 rounded-lg border flex items-center justify-center ${tone.chip}`}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                autoComplete="new-password"
                placeholder={t('Confirm password')}
                aria-label={t('Confirm password')}
                className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-500/40 ${tone.input}`}
              />
              {passwordError && (password.length > 0 || confirm.length > 0) && (
                <p className={`text-xs ${dark ? 'text-amber-300' : 'text-amber-700'}`}>{passwordError}</p>
              )}
            </div>
          )}
        </div>
      )}

      {error && <p className={`text-xs ${dark ? 'text-red-300' : 'text-destructive'}`}>{error}</p>}

      <button
        onClick={create}
        disabled={busy || pages.length === 0 || !!passwordError}
        className="w-full px-6 py-4 rounded-xl font-semibold text-sm text-white bg-violet-600 flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
        {busy
          ? (progress || (isPdf ? t('Creating PDF…') : t('Creating JPG…')))
          : isPdf
            ? (pages.length === 1 ? t('Save as PDF ({count} page)', { count: pages.length }) : t('Save as PDF ({count} pages)', { count: pages.length }))
            : (pages.length === 1 ? t('Save as JPG ({count} page)', { count: pages.length }) : t('Save as JPG ({count} pages)', { count: pages.length }))}
      </button>
    </div>
  );
}
