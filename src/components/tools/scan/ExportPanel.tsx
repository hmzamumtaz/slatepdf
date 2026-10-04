'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Eye, EyeOff, FileDown, Loader2, Lock, Share2, Wand2 } from 'lucide-react';
import { scannedPagesToPdf, downloadBlob, downloadBlobsAsZip, protectPdf, type ScanPdfOptions } from '@/lib/pdf-engine';
import { addScan } from '@/lib/scan-library';
import { friendlyError } from '@/lib/errors';
import { trackConversion } from '@/lib/stats';
import { pageForExport, QUALITY_SETTINGS, type ScanPage, type ScanQuality } from '@/lib/scan-session';

const PAGE_SIZES: { label: string; value: NonNullable<ScanPdfOptions['pageSize']> }[] = [
  { label: 'Fit page', value: 'original' },
  { label: 'A4', value: 'a4' },
  { label: 'Letter', value: 'letter' },
  { label: 'Legal', value: 'legal' },
  { label: 'A4 landscape', value: 'a4-landscape' },
  { label: 'Letter landscape', value: 'letter-landscape' },
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
  { code: 'eng', name: 'English' },
  { code: 'spa', name: 'Spanish' },
  { code: 'fra', name: 'French' },
  { code: 'deu', name: 'German' },
  { code: 'ita', name: 'Italian' },
  { code: 'por', name: 'Portuguese' },
  { code: 'nld', name: 'Dutch' },
  { code: 'tur', name: 'Turkish' },
  { code: 'pol', name: 'Polish' },
  { code: 'rus', name: 'Russian' },
  { code: 'ara', name: 'Arabic' },
  { code: 'hin', name: 'Hindi' },
  { code: 'urd', name: 'Urdu' },
  { code: 'ind', name: 'Indonesian' },
  { code: 'vie', name: 'Vietnamese' },
  { code: 'chi_sim', name: 'Chinese (Simplified)' },
  { code: 'jpn', name: 'Japanese' },
  { code: 'kor', name: 'Korean' },
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
      ? `Use at least ${MIN_PASSWORD} characters.`
      : password !== confirm
        ? 'The passwords don’t match.'
        : null;

  // A finished file only stays valid while the pages and options it was made from are unchanged.
  const key = JSON.stringify([pages.map(p => [p.id, p.url]), format, pageSize, quality, useOcr, lang, docName, useProtect, useProtect ? password : '']);
  const current = result && resultKey === key ? result : null;

  const createJpg = async () => {
    const base = baseName(docName);
    const images: File[] = [];
    for (let i = 0; i < pages.length; i++) {
      setProgress(`Preparing page ${i + 1} of ${pages.length}…`);
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
      setProgress(`Preparing page ${i + 1} of ${pages.length}…`);
      blobs.push(await pageForExport(pages[i], quality));
    }
    let pdf = await scannedPagesToPdf(blobs, {
      pageSize,
      title: docName.trim() || undefined,
      ocrLanguages: useOcr ? [lang] : undefined,
      onProgress: setProgress,
    });
    if (useProtect) {
      setProgress('Adding the password…');
      // Encryption wraps the finished file, so the OCR text layer stays searchable once it's opened.
      pdf = await protectPdf(new File([pdf], safeFileName(docName), { type: 'application/pdf' }), password);
    }
    setProgress('Saving to Recent scans…');
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
        ? `${friendlyError(err)} If text recognition could not load (it needs a connection the first time), turn it off and try again.`
        : friendlyError(err));
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
      setError(friendlyError(err));
    }
  };

  const t = dark
    ? { label: 'text-white', muted: 'text-white/60', chip: 'border-white/15 text-white/80', input: 'bg-white/10 border-white/15 text-white placeholder:text-white/40', card: 'bg-white/5 border-white/10' }
    : { label: 'text-foreground', muted: 'text-muted-foreground', chip: 'border-border text-muted-foreground hover:text-foreground', input: 'bg-white border-border text-foreground', card: 'bg-gray-50 border-border' };
  const chip = (on: boolean) => `min-h-11 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${on ? 'bg-violet-600 border-violet-600 text-white' : t.chip}`;

  if (current) {
    return (
      <div className="space-y-4">
        <div className={`p-4 rounded-xl border flex items-start gap-3 ${dark ? 'bg-green-500/10 border-green-500/30' : 'bg-green-50 border-green-200'}`}>
          <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className={`text-sm font-semibold ${dark ? 'text-green-300' : 'text-green-800'}`}>
              {current.format === 'pdf' ? 'PDF ready' : current.images.length === 1 ? 'JPG ready' : 'JPGs ready'}
            </p>
            <p className={`text-sm break-words ${dark ? 'text-green-200/80' : 'text-green-700'}`}>
              {fileName} · {pages.length} page{pages.length > 1 ? 's' : ''} · {formatBytes(current.size)}{current.searchable ? ' · searchable' : ''}{current.locked ? ' · password protected' : ''}
            </p>
            {current.format === 'pdf' && (
              <p className={`text-xs mt-1 ${dark ? 'text-green-200/70' : 'text-green-700/80'}`}>
                {current.stored
                  ? 'A copy is in Recent scans, stored in this browser on this device only.'
                  : 'This browser didn’t allow saving a copy on this device (private browsing can block it), so download it now.'}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button onClick={() => void download()} className="flex-1 px-6 py-3 rounded-xl font-semibold text-sm text-white bg-violet-600 flex items-center justify-center gap-2 active:scale-[0.98]">
            <FileDown className="w-4 h-4" />
            {current.format === 'pdf' ? 'Download PDF' : current.images.length === 1 ? 'Download JPG' : `Download ${current.images.length} JPGs (.zip)`}
          </button>
          {canShare && (
            <button onClick={share} className={`flex-1 px-6 py-3 rounded-xl font-semibold text-sm border flex items-center justify-center gap-2 ${dark ? 'border-white/20 text-white' : 'border-border text-foreground'}`}>
              <Share2 className="w-4 h-4" /> Share
            </button>
          )}
        </div>
        {error && <p className={`text-xs ${dark ? 'text-red-300' : 'text-destructive'}`}>{error}</p>}
        <p className={`text-xs ${t.muted}`}>
          {current.format === 'pdf'
            ? <>Next: <Link href="/tools/sign-pdf" className="underline">sign it</Link>{current.locked ? '' : <>, <Link href="/tools/protect-pdf" className="underline">add a password</Link></>} or <Link href="/tools/compress-pdf" className="underline">compress it further</Link>.</>
            : <>Next: <Link href="/tools/jpg-to-pdf" className="underline">turn images into a PDF</Link> or <Link href="/tools/compress-pdf" className="underline">compress a PDF</Link>.</>}
          {onScanNew && <> · <button onClick={onScanNew} className="underline">Start a new scan</button></>}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <label className="block">
        <span className={`text-sm font-semibold ${t.label}`}>File name</span>
        <input value={docName} onChange={e => onDocName(e.target.value)} className={`mt-2 w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-500/40 ${t.input}`} />
      </label>

      <div>
        <span className={`text-sm font-semibold ${t.label}`}>Format</span>
        <div className="grid grid-cols-2 gap-2 mt-2" role="group" aria-label="Format">
          <button onClick={() => setFormat('pdf')} aria-pressed={isPdf} className={chip(isPdf)}>PDF</button>
          <button onClick={() => setFormat('jpg')} aria-pressed={!isPdf} className={chip(!isPdf)}>JPG</button>
        </div>
        {!isPdf && (
          <p className={`text-xs mt-1.5 ${t.muted}`}>
            {pages.length === 1 ? 'One JPG image of the page.' : `${pages.length} JPG images, one per page, in a .zip.`} Text recognition and passwords only apply to PDFs.
          </p>
        )}
      </div>

      {isPdf && (
        <div>
          <span className={`text-sm font-semibold ${t.label}`}>Page size</span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2" role="group" aria-label="Page size">
            {PAGE_SIZES.map(s => <button key={s.value} onClick={() => setPageSize(s.value)} aria-pressed={pageSize === s.value} className={chip(pageSize === s.value)}>{s.label}</button>)}
          </div>
        </div>
      )}

      <div>
        <span className={`text-sm font-semibold ${t.label}`}>File size</span>
        <div className="grid grid-cols-3 gap-2 mt-2">
          {(Object.keys(QUALITY_SETTINGS) as ScanQuality[]).map(q => (
            <button key={q} onClick={() => setQuality(q)} className={chip(quality === q)}>{QUALITY_SETTINGS[q].label}</button>
          ))}
        </div>
        <p className={`text-xs mt-1.5 ${t.muted}`}>{QUALITY_SETTINGS[quality].hint}</p>
      </div>

      {isPdf && <div className={`rounded-xl border p-3 ${t.card}`}>
        <label className="flex items-start gap-3">
          <input type="checkbox" checked={ocr} onChange={e => setOcr(e.target.checked)} className="mt-0.5 w-4 h-4 accent-violet-600" />
          <span>
            <span className={`block text-sm font-semibold ${t.label}`}>Recognize text (OCR)</span>
            <span className={`block text-xs mt-0.5 ${t.muted}`}>Makes the PDF searchable and lets you copy its text. Runs on this device; the language model downloads once (a few MB).</span>
          </span>
        </label>
        {ocr && (
          <select value={lang} onChange={e => setLang(e.target.value)} className={`mt-3 w-full rounded-lg border px-3 py-2 text-sm ${t.input}`} aria-label="Document language">
            {OCR_LANGUAGES.map(l => <option key={l.code} value={l.code} className="text-gray-900">{l.name}</option>)}
          </select>
        )}
      </div>}

      {isPdf && (
        <div className={`rounded-xl border p-3 ${t.card}`}>
          <label className="flex items-start gap-3">
            <input type="checkbox" checked={protect} onChange={e => setProtect(e.target.checked)} className="mt-0.5 w-4 h-4 accent-violet-600" />
            <span>
              <span className={`flex items-center gap-1.5 text-sm font-semibold ${t.label}`}><Lock className="w-3.5 h-3.5" /> Protect with a password</span>
              <span className={`block text-xs mt-0.5 ${t.muted}`}>Anyone opening the PDF will need it. Encrypted on this device. There is no way to recover a forgotten password, so keep it somewhere safe.</span>
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
                  placeholder="Password"
                  aria-label="Password"
                  className={`min-w-0 flex-1 rounded-lg border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-500/40 ${t.input}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  className={`w-11 h-11 shrink-0 rounded-lg border flex items-center justify-center ${t.chip}`}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                autoComplete="new-password"
                placeholder="Confirm password"
                aria-label="Confirm password"
                className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-500/40 ${t.input}`}
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
          ? (progress || (isPdf ? 'Creating PDF…' : 'Creating JPG…'))
          : `Save as ${isPdf ? 'PDF' : 'JPG'} (${pages.length} page${pages.length === 1 ? '' : 's'})`}
      </button>
    </div>
  );
}
