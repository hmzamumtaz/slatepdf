'use client';

import { useCallback, useEffect, useState, type ChangeEvent } from 'react';
import { Check, Copy, Loader2, RotateCcw, Share2, UserRoundPlus, X } from 'lucide-react';
import { OCR_LANGUAGES } from './ExportPanel';
import {
  contactToText,
  contactToVcf,
  copyText,
  extractContact,
  ocrErrorMessage,
  recognizeImage,
  safeBaseName,
  saveFile,
  type Contact,
} from '@/lib/scan-ocr';

type Status = 'running' | 'done' | 'error';

/** Editable form state: multi-value fields are one value per line. */
interface ContactForm {
  name: string;
  title: string;
  company: string;
  phones: string;
  emails: string;
  websites: string;
  address: string;
  notes: string;
}

const EMPTY_FORM: ContactForm = { name: '', title: '', company: '', phones: '', emails: '', websites: '', address: '', notes: '' };

function toForm(c: Contact): ContactForm {
  return {
    name: c.name,
    title: c.title,
    company: c.company,
    phones: c.phones.join('\n'),
    emails: c.emails.join('\n'),
    websites: c.websites.join('\n'),
    address: c.address,
    notes: c.notes,
  };
}

function splitLines(s: string): string[] {
  return s.split(/\r?\n/).map(v => v.trim()).filter(Boolean);
}

function toContact(f: ContactForm): Contact {
  return {
    name: f.name.trim(),
    title: f.title.trim(),
    company: f.company.trim(),
    phones: splitLines(f.phones),
    emails: splitLines(f.emails),
    websites: splitLines(f.websites),
    address: f.address.trim().replace(/\s*\r?\n\s*/g, ', '),
    notes: f.notes.trim(),
  };
}

const FIELDS: { key: keyof ContactForm; label: string; multi?: boolean; rows?: number; type?: string; autoComplete?: string; hint?: string }[] = [
  { key: 'name', label: 'Name', autoComplete: 'off' },
  { key: 'title', label: 'Job title' },
  { key: 'company', label: 'Company' },
  { key: 'phones', label: 'Phone numbers', multi: true, rows: 2, hint: 'One per line' },
  { key: 'emails', label: 'Emails', multi: true, rows: 2, hint: 'One per line' },
  { key: 'websites', label: 'Websites', multi: true, rows: 2, hint: 'One per line' },
  { key: 'address', label: 'Address', multi: true, rows: 2 },
  { key: 'notes', label: 'Notes', multi: true, rows: 3 },
];

const inputClass =
  'w-full min-h-11 rounded-xl bg-gray-900 border border-white/15 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-violet-500';

/**
 * "Business card": read a scanned card on this device, pre-fill a contact
 * form from it, and save/share it as a vCard.
 */
export default function ContactSheet({ image, onClose }: { image: Blob; onClose: () => void }) {
  const [lang, setLang] = useState('eng');
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<Status>('running');
  const [progress, setProgress] = useState(0);
  const [form, setForm] = useState<ContactForm>(EMPTY_FORM);
  const [rawText, setRawText] = useState('');
  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');

  useEffect(() => {
    let cancelled = false;
    recognizeImage(image, lang, p => { if (!cancelled) setProgress(p); }).then(
      res => {
        if (cancelled) return;
        setRawText(res.text);
        setForm(toForm(extractContact(res.lines.join('\n'))));
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

  // Card thumbnail: the object URL lives exactly as long as the <img> node.
  const previewRef = useCallback((el: HTMLImageElement | null) => {
    if (!el) return;
    const url = URL.createObjectURL(image);
    el.src = url;
    return () => URL.revokeObjectURL(url);
  }, [image]);

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

  const contact = toContact(form);
  const hasData = status === 'done' && Object.values(contact).some(v => (Array.isArray(v) ? v.length > 0 : v !== ''));
  const fileName = `${safeBaseName(contact.name || contact.company, 'contact')}.vcf`;
  const makeFile = () => new File([contactToVcf(contact)], fileName, { type: 'text/vcard' });

  const canShareFiles = (() => {
    if (typeof navigator === 'undefined' || typeof navigator.canShare !== 'function') return false;
    try {
      return navigator.canShare({ files: [new File([''], 'contact.vcf', { type: 'text/vcard' })] });
    } catch {
      return false;
    }
  })();

  const save = () => saveFile(makeFile(), fileName);
  const share = async () => {
    const file = makeFile();
    try {
      if (!navigator.canShare?.({ files: [file] })) throw new Error('unsupported');
      await navigator.share({ files: [file], title: contact.name || 'Contact' });
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setFlash('Sharing files is not available here — use Save instead');
    }
  };
  const copy = async () => {
    const ok = await copyText(contactToText(contact));
    setFlash(ok ? 'Copied' : 'Copy failed');
  };

  const busy = status === 'running';
  const pct = Math.round(progress * 100);

  return (
    <div
      className="absolute inset-0 z-40 flex flex-col bg-gray-950 text-white"
      role="dialog"
      aria-modal="true"
      aria-labelledby="scan-contact-sheet-title"
    >
      <div className="flex items-center justify-between gap-2 px-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-2">
        <button onClick={onClose} className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-white/10" aria-label="Close Business card">
          <X className="w-6 h-6" />
        </button>
        <h2 id="scan-contact-sheet-title" className="text-sm font-semibold">Business card</h2>
        <div className="w-11 h-11" aria-hidden="true" />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
        <div className="flex flex-col gap-3 px-4 pb-4 max-w-2xl w-full mx-auto">
          {/* eslint-disable-next-line @next/next/no-img-element -- local Blob preview */}
          <img ref={previewRef} alt="Scanned business card" className="max-h-36 w-auto self-center rounded-lg shadow-2xl object-contain" />

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
                {progress > 0 ? `Reading card… ${pct}%` : 'Preparing text recognition…'}
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
                Runs on this device. The first use of a language downloads its model; your card is never uploaded.
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
              {!rawText.trim() && (
                <p className="text-sm text-white/70">
                  No text was found on this card. Try a sharper, well-lit scan, or fill the fields in yourself.
                </p>
              )}
              <form className="flex flex-col gap-3" onSubmit={e => { e.preventDefault(); save(); }}>
                {FIELDS.map(f => {
                  const id = `scan-contact-${f.key}`;
                  const common = {
                    id,
                    value: form[f.key],
                    onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
                      const value = e.target.value;
                      setForm(prev => ({ ...prev, [f.key]: value }));
                    },
                    className: inputClass,
                    'aria-describedby': f.hint ? `${id}-hint` : undefined,
                  };
                  return (
                    <div key={f.key} className="flex flex-col gap-1">
                      <div className="flex items-baseline gap-2">
                        <label htmlFor={id} className="text-xs font-semibold text-white/80">{f.label}</label>
                        {f.hint && <span id={`${id}-hint`} className="text-xs text-white/50">{f.hint}</span>}
                      </div>
                      {f.multi
                        ? <textarea {...common} rows={f.rows} className={`${inputClass} resize-y`} />
                        : <input {...common} type="text" autoComplete={f.autoComplete ?? 'off'} />}
                    </div>
                  );
                })}
              </form>
              <p className="text-xs text-white/60">Fields are read automatically — check them before saving.</p>
              {rawText.trim() && (
                <details className="rounded-xl bg-gray-900 border border-white/10 px-3">
                  <summary className="min-h-11 flex items-center text-xs font-semibold text-white/80 cursor-pointer">
                    Show all recognised text
                  </summary>
                  <pre className="pb-3 whitespace-pre-wrap break-words text-xs text-white/70 font-sans">{rawText}</pre>
                </details>
              )}
            </>
          )}
        </div>
      </div>

      <div className="px-4 pt-2 pb-[calc(env(safe-area-inset-bottom)+1rem)] max-w-2xl w-full mx-auto border-t border-white/10">
        <p className="min-h-5 text-center text-xs text-white/80" aria-live="polite">{flash}</p>
        <button
          onClick={save}
          disabled={!hasData}
          className="mt-1 w-full min-h-12 rounded-xl bg-violet-600 text-sm font-semibold flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-40"
        >
          <UserRoundPlus className="w-4 h-4" /> Save contact (.vcf)
        </button>
        <div className="mt-2 flex gap-2">
          {canShareFiles && (
            <button
              onClick={share}
              disabled={!hasData}
              className="flex-1 min-h-12 rounded-xl bg-white/10 text-sm font-semibold flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-40"
            >
              <Share2 className="w-4 h-4" /> Share .vcf
            </button>
          )}
          <button
            onClick={copy}
            disabled={!hasData}
            className="flex-1 min-h-12 rounded-xl bg-white/10 text-sm font-semibold flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-40"
          >
            {flash === 'Copied' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} Copy as text
          </button>
        </div>
      </div>
    </div>
  );
}
