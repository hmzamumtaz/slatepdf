'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Copy, Download, Loader2, RotateCcw, Share2, X } from 'lucide-react';
import { OCR_LANGUAGES } from './ExportPanel';
import { copyText, ocrErrorMessage, recognizeImage, saveFile } from '@/lib/scan-ocr';

type Status = 'running' | 'done' | 'error';

/**
 * "Copy text": recognise the text of one scanned page on this device and let
 * the user edit, copy, download or share it.
 */
export default function TextSheet({ image, onClose }: { image: Blob; onClose: () => void }) {
  const [lang, setLang] = useState('eng');
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<Status>('running');
  const [progress, setProgress] = useState(0);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');
  const fieldRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let cancelled = false;
    recognizeImage(image, lang, p => { if (!cancelled) setProgress(p); }).then(
      res => {
        if (cancelled) return;
        setText(res.text);
        setStatus('done');
      },
      err => {
        if (cancelled) return;
        setError(ocrErrorMessage(err));
        setStatus('error');
      },
    );
    return () => { cancelled = true; };
  }, [image, lang, attempt]);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(''), 1800);
    return () => clearTimeout(t);
  }, [flash]);

  const restart = () => {
    setStatus('running');
    setProgress(0);
    setError('');
  };
  const changeLang = (code: string) => {
    if (code === lang) return;
    restart();
    setLang(code);
  };
  const retry = () => {
    restart();
    setAttempt(a => a + 1);
  };

  const copy = async () => {
    const ok = await copyText(text, fieldRef.current);
    setFlash(ok ? 'Copied' : 'Copy failed — select the text and copy it manually');
  };
  const download = () => {
    saveFile(new Blob([text.replace(/\r?\n/g, '\r\n')], { type: 'text/plain;charset=utf-8' }), 'scanned-text.txt');
  };
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  const share = async () => {
    try {
      await navigator.share({ title: 'Scanned text', text });
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setFlash('Sharing is not available here — use Copy instead');
    }
  };

  const busy = status === 'running';
  const hasText = status === 'done' && text.trim().length > 0;
  const pct = Math.round(progress * 100);

  return (
    <div
      className="absolute inset-0 z-40 flex flex-col bg-gray-950 text-white"
      role="dialog"
      aria-modal="true"
      aria-labelledby="scan-text-sheet-title"
    >
      <div className="flex items-center justify-between gap-2 px-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-2">
        <button onClick={onClose} className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-white/10" aria-label="Close Copy text">
          <X className="w-6 h-6" />
        </button>
        <h2 id="scan-text-sheet-title" className="text-sm font-semibold">Copy text</h2>
        <div className="w-11 h-11" aria-hidden="true" />
      </div>

      <div className="flex-1 min-h-0 flex flex-col gap-3 px-4 pb-3 max-w-2xl w-full mx-auto">
        <label className="flex items-center gap-3 text-xs font-semibold text-white/80">
          Language
          <select
            value={lang}
            onChange={e => changeLang(e.target.value)}
            disabled={busy}
            className="flex-1 min-h-11 rounded-xl bg-gray-900 border border-white/15 px-3 text-sm text-white disabled:opacity-50"
          >
            {OCR_LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
          </select>
        </label>

        {busy && (
          <div className="rounded-xl bg-gray-900 p-4" role="status" aria-live="polite">
            <div className="flex items-center gap-2 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              {progress > 0 ? `Reading text… ${pct}%` : 'Preparing text recognition…'}
            </div>
            <div
              className="mt-3 h-2 rounded-full bg-white/10 overflow-hidden"
              role="progressbar"
              aria-label="Text recognition progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={pct}
            >
              <div className="h-full bg-violet-500 transition-[width] duration-200" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-3 text-xs text-white/60">
              Runs on this device. The first use of a language downloads its model; your scan is never uploaded.
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="rounded-xl bg-red-500/10 border border-red-400/30 p-4" role="alert">
            <p className="text-sm text-red-200">{error}</p>
            <button onClick={retry} className="mt-3 min-h-11 px-4 rounded-xl bg-white/10 text-sm font-semibold flex items-center gap-2">
              <RotateCcw className="w-4 h-4" /> Try again
            </button>
          </div>
        )}

        {status === 'done' && (
          <>
            {!hasText && (
              <p className="text-sm text-white/70">
                No text was found on this page. Try a sharper, well-lit scan or pick the right language.
              </p>
            )}
            <label htmlFor="scan-text-output" className="sr-only">Recognised text</label>
            <textarea
              id="scan-text-output"
              ref={fieldRef}
              value={text}
              onChange={e => setText(e.target.value)}
              spellCheck={false}
              className="flex-1 min-h-40 w-full resize-none rounded-xl bg-gray-900 border border-white/15 p-3 text-sm leading-relaxed text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="Recognised text appears here"
            />
            <p className="text-xs text-white/60">Recognition can make mistakes — check names and numbers before using the text.</p>
          </>
        )}
      </div>

      <div className="px-4 pt-2 pb-[calc(env(safe-area-inset-bottom)+1rem)] max-w-2xl w-full mx-auto">
        <p className="min-h-5 text-center text-xs text-white/80" aria-live="polite">{flash}</p>
        <div className="mt-1 flex gap-2">
          <button
            onClick={copy}
            disabled={!hasText}
            className="flex-1 min-h-12 rounded-xl bg-violet-600 text-sm font-semibold flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-40"
          >
            {flash === 'Copied' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} Copy
          </button>
          <button
            onClick={download}
            disabled={!hasText}
            aria-label="Download as .txt"
            className="flex-1 min-h-12 rounded-xl bg-white/10 text-sm font-semibold flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-40"
          >
            <Download className="w-4 h-4" /> .txt
          </button>
          {canShare && (
            <button
              onClick={share}
              disabled={!hasText}
              className="flex-1 min-h-12 rounded-xl bg-white/10 text-sm font-semibold flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-40"
            >
              <Share2 className="w-4 h-4" /> Share
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
