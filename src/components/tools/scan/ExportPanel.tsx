'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, FileDown, Loader2, Share2, Wand2 } from 'lucide-react';
import { scannedPagesToPdf, downloadBlob, type ScanPdfOptions } from '@/lib/pdf-engine';
import { friendlyError } from '@/lib/errors';
import { trackConversion } from '@/lib/stats';
import { pageForExport, QUALITY_SETTINGS, type ScanPage, type ScanQuality } from '@/lib/scan-session';

const PAGE_SIZES: { label: string; value: NonNullable<ScanPdfOptions['pageSize']> }[] = [
  { label: 'Fit page', value: 'original' },
  { label: 'A4', value: 'a4' },
  { label: 'Letter', value: 'letter' },
  { label: 'A4 landscape', value: 'a4-landscape' },
];

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

export default function ExportPanel({ pages, docName, onDocName, dark, onScanNew }: Props) {
  const [pageSize, setPageSize] = useState<NonNullable<ScanPdfOptions['pageSize']>>('original');
  const [quality, setQuality] = useState<ScanQuality>('medium');
  const [ocr, setOcr] = useState(true);
  const [lang, setLang] = useState('eng');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Blob | null>(null);
  const [resultKey, setResultKey] = useState('');

  // A finished PDF only stays valid while the pages and options it was made from are unchanged.
  const key = JSON.stringify([pages.map(p => [p.id, p.url]), pageSize, quality, ocr, lang, docName]);
  const current = result && resultKey === key ? result : null;

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      const blobs: Blob[] = [];
      for (let i = 0; i < pages.length; i++) {
        setProgress(`Preparing page ${i + 1} of ${pages.length}…`);
        blobs.push(await pageForExport(pages[i], quality));
      }
      const pdf = await scannedPagesToPdf(blobs, {
        pageSize,
        title: docName.trim() || undefined,
        ocrLanguages: ocr ? [lang] : undefined,
        onProgress: setProgress,
      });
      setResult(pdf);
      setResultKey(key);
      trackConversion('scan-pdf');
    } catch (err) {
      setError(ocr
        ? `${friendlyError(err)} If text recognition could not load (it needs a connection the first time), turn it off and try again.`
        : friendlyError(err));
    } finally {
      setBusy(false);
      setProgress('');
    }
  };

  const fileName = safeFileName(docName);
  const pdfFile = current ? new File([current], fileName, { type: 'application/pdf' }) : null;
  const canShare = typeof navigator !== 'undefined' && !!pdfFile && !!navigator.canShare?.({ files: [pdfFile] });

  const share = async () => {
    if (!pdfFile) return;
    try {
      await navigator.share({ files: [pdfFile], title: docName });
    } catch {
      /* the user closed the share sheet */
    }
  };

  const t = dark
    ? { label: 'text-white', muted: 'text-white/60', chip: 'border-white/15 text-white/80', input: 'bg-white/10 border-white/15 text-white placeholder:text-white/40', card: 'bg-white/5 border-white/10' }
    : { label: 'text-foreground', muted: 'text-muted-foreground', chip: 'border-border text-muted-foreground hover:text-foreground', input: 'bg-white border-border text-foreground', card: 'bg-gray-50 border-border' };
  const chip = (on: boolean) => `px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${on ? 'bg-violet-600 border-violet-600 text-white' : t.chip}`;

  if (current) {
    return (
      <div className="space-y-4">
        <div className={`p-4 rounded-xl border flex items-start gap-3 ${dark ? 'bg-green-500/10 border-green-500/30' : 'bg-green-50 border-green-200'}`}>
          <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className={`text-sm font-semibold ${dark ? 'text-green-300' : 'text-green-800'}`}>PDF ready</p>
            <p className={`text-sm break-words ${dark ? 'text-green-200/80' : 'text-green-700'}`}>{fileName} · {pages.length} page{pages.length > 1 ? 's' : ''} · {formatBytes(current.size)}{ocr ? ' · searchable' : ''}</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button onClick={() => downloadBlob(current, fileName)} className="flex-1 px-6 py-3 rounded-xl font-semibold text-sm text-white bg-violet-600 flex items-center justify-center gap-2 active:scale-[0.98]">
            <FileDown className="w-4 h-4" /> Download PDF
          </button>
          {canShare && (
            <button onClick={share} className={`flex-1 px-6 py-3 rounded-xl font-semibold text-sm border flex items-center justify-center gap-2 ${dark ? 'border-white/20 text-white' : 'border-border text-foreground'}`}>
              <Share2 className="w-4 h-4" /> Share
            </button>
          )}
        </div>
        <p className={`text-xs ${t.muted}`}>
          Next: <Link href="/tools/sign-pdf" className="underline">sign it</Link>, <Link href="/tools/protect-pdf" className="underline">add a password</Link> or <Link href="/tools/compress-pdf" className="underline">compress it further</Link>.
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
        <span className={`text-sm font-semibold ${t.label}`}>Page size</span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
          {PAGE_SIZES.map(s => <button key={s.value} onClick={() => setPageSize(s.value)} className={chip(pageSize === s.value)}>{s.label}</button>)}
        </div>
      </div>

      <div>
        <span className={`text-sm font-semibold ${t.label}`}>File size</span>
        <div className="grid grid-cols-3 gap-2 mt-2">
          {(Object.keys(QUALITY_SETTINGS) as ScanQuality[]).map(q => (
            <button key={q} onClick={() => setQuality(q)} className={chip(quality === q)}>{QUALITY_SETTINGS[q].label}</button>
          ))}
        </div>
        <p className={`text-xs mt-1.5 ${t.muted}`}>{QUALITY_SETTINGS[quality].hint}</p>
      </div>

      <div className={`rounded-xl border p-3 ${t.card}`}>
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
      </div>

      {error && <p className={`text-xs ${dark ? 'text-red-300' : 'text-destructive'}`}>{error}</p>}

      <button
        onClick={create}
        disabled={busy || pages.length === 0}
        className="w-full px-6 py-4 rounded-xl font-semibold text-sm text-white bg-violet-600 flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
        {busy ? (progress || 'Creating PDF…') : `Save as PDF (${pages.length} page${pages.length === 1 ? '' : 's'})`}
      </button>
    </div>
  );
}
