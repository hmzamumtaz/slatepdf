'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Download, Loader2, AlertCircle, Check, Undo2, Redo2, History,
  TextCursorInput, Eraser, Files, PenTool, Droplets, Crop, Lock, X,
} from 'lucide-react';
import FileUpload from '@/components/FileUpload';
import PdfEditor from '@/components/PdfEditor';
import RedactPanel from '@/components/workspace/RedactPanel';
import PagesPanel from '@/components/workspace/PagesPanel';
import SignPanel from '@/components/workspace/SignPanel';
import StampPanel from '@/components/workspace/StampPanel';
import AdjustPanel from '@/components/workspace/AdjustPanel';
import ProtectPanel from '@/components/workspace/ProtectPanel';
import { downloadBlob, getOutputFilename, isPdfPasswordProtected } from '@/lib/pdf-engine';
import { blobToFile, countPages, formatSize, type Version } from '@/lib/workspace';

/**
 * One document, every tool.
 *
 * The whole point is that a change made in one tab is already there in the
 * next: each step produces a real PDF, that PDF becomes the document, and the
 * following tab opens it. Nothing is queued or replayed at the end, so the
 * download button means the same thing at every moment — give me what I am
 * looking at right now.
 */

type TabId = 'edit' | 'redact' | 'pages' | 'sign' | 'stamp' | 'adjust' | 'protect';

const TABS: { id: TabId; label: string; icon: typeof Eraser; blurb: string }[] = [
  { id: 'edit', label: 'Edit', icon: TextCursorInput, blurb: 'Rewrite text, swap pictures' },
  { id: 'redact', label: 'Redact', icon: Eraser, blurb: 'Remove what should not be seen' },
  { id: 'pages', label: 'Pages', icon: Files, blurb: 'Reorder, turn, drop, insert' },
  { id: 'sign', label: 'Sign', icon: PenTool, blurb: 'Draw or type a signature' },
  { id: 'stamp', label: 'Stamp', icon: Droplets, blurb: 'Watermark and page numbers' },
  { id: 'adjust', label: 'Adjust', icon: Crop, blurb: 'Crop margins, shrink the file' },
  { id: 'protect', label: 'Protect', icon: Lock, blurb: 'Lock it with a password' },
];

const messageOf = (err: unknown, fallback: string) =>
  err instanceof Error && err.message ? err.message : fallback;

export default function PdfWorkspacePage() {
  const [history, setHistory] = useState<Version[]>([]);
  const [cursor, setCursor] = useState(0);
  const [tab, setTab] = useState<TabId>('edit');
  const [busy, setBusy] = useState(false);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [name, setName] = useState('document.pdf');
  const nextId = useRef(1);

  const current: Version | null = history[cursor] ?? null;

  /** Encryption is a one-way door — everything downstream reads the file back. */
  const locked = useMemo(
    () => history.slice(0, cursor + 1).some(v => v.label === 'Password protected'),
    [history, cursor],
  );

  const open = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setOpening(true);
    setError(null);
    try {
      // An encrypted file can be "loaded" but not rendered, so say so plainly
      // rather than letting every tab fail in its own way.
      if (await isPdfPasswordProtected(file)) {
        throw new Error('This PDF is password protected. Remove the password with Unlock PDF first, then bring it back here.');
      }
      const pages = await countPages(file);
      setName(file.name);
      nextId.current = 2;
      setHistory([{ id: 1, file, label: 'Opened', pages, size: file.size }]);
      setCursor(0);
      setTab('edit');
      setSaved(false);
    } catch (err) {
      setError(messageOf(err, 'Could not open this PDF.'));
    } finally {
      setOpening(false);
    }
  }, []);

  const close = useCallback(() => {
    setHistory([]);
    setCursor(0);
    setError(null);
    setSaved(false);
    setShowHistory(false);
  }, []);

  /**
   * Run one tool and make its result the document. Everything a panel does
   * comes through here, which is what keeps the history honest.
   */
  const apply = useCallback(async (run: () => Promise<Blob>, label: string) => {
    setBusy(true);
    setError(null);
    try {
      const blob = await run();
      const file = blobToFile(blob, name);
      let pages = current?.pages ?? 0;
      try {
        pages = await countPages(file);
      } catch {
        // An encrypted result cannot be counted; keep the last known figure.
      }
      setHistory(prev => {
        const kept = prev.slice(0, cursor + 1);
        return [...kept, { id: nextId.current++, file, label, pages, size: file.size }];
      });
      setCursor(c => c + 1);
      setSaved(false);
    } catch (err) {
      setError(messageOf(err, 'That step could not be completed.'));
    } finally {
      setBusy(false);
    }
  }, [cursor, current, name]);

  const saveEdited = useCallback(
    (bytes: Uint8Array) => apply(
      async () => new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' }),
      'Edited text and pictures',
    ),
    [apply],
  );

  const download = useCallback(() => {
    if (!current) return;
    downloadBlob(current.file, getOutputFilename('pdf-workspace', '.pdf'));
    setSaved(true);
  }, [current]);

  const step = (to: number) => {
    setCursor(Math.max(0, Math.min(history.length - 1, to)));
    setError(null);
    setSaved(false);
  };

  const panelProps = current
    ? { file: current.file, pages: current.pages, busy, apply }
    : null;

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 mb-4">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            All tools
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">PDF Workspace</h1>
          <p className="text-muted-foreground text-[13px]">
            Every tool, one document. Each change carries into the next tab — download whenever you like.
          </p>
        </div>

        {!current ? (
          <div className="bg-white rounded-2xl border border-border p-6 sm:p-8 shadow-sm max-w-3xl">
            <FileUpload
              accept=".pdf"
              multiple={false}
              files={[]}
              onFilesSelected={open}
              onRemoveFile={close}
            />
            {opening && (
              <p className="mt-6 inline-flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Opening…
              </p>
            )}
            {error && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <ul className="mt-8 grid sm:grid-cols-2 gap-x-6 gap-y-3">
              {TABS.map(({ id, label, icon: Icon, blurb }) => (
                <li key={id} className="flex items-start gap-2.5">
                  <span className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Icon className="w-3.5 h-3.5 text-foreground" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13px] font-medium text-foreground">{label}</span>
                    <span className="block text-[12px] text-muted-foreground">{blurb}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col h-[calc(100vh-11rem)] min-h-[38rem]">
            {/* Document bar */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 border-b border-border shrink-0">
              <p className="text-[13px] font-medium text-foreground truncate max-w-[14rem]" title={name}>
                {name}
              </p>
              <span className="text-xs text-muted-foreground tabular-nums">
                {current.pages} page{current.pages === 1 ? '' : 's'} · {formatSize(current.size)}
              </span>
              <button onClick={close} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Close
              </button>

              <span className="w-px h-5 bg-border" />

              <div className="flex items-center gap-1">
                <button
                  onClick={() => step(cursor - 1)}
                  disabled={cursor === 0 || busy}
                  className="w-7 h-7 rounded-md border border-border flex items-center justify-center hover:bg-muted disabled:opacity-40 transition-colors"
                  aria-label="Step back"
                  title={cursor > 0 ? `Back to: ${history[cursor - 1].label}` : 'Nothing to undo'}
                >
                  <Undo2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => step(cursor + 1)}
                  disabled={cursor >= history.length - 1 || busy}
                  className="w-7 h-7 rounded-md border border-border flex items-center justify-center hover:bg-muted disabled:opacity-40 transition-colors"
                  aria-label="Step forward"
                  title={cursor < history.length - 1 ? `Forward to: ${history[cursor + 1].label}` : 'Nothing to redo'}
                >
                  <Redo2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setShowHistory(v => !v)}
                  className={`inline-flex items-center gap-1.5 px-2.5 h-7 rounded-md border text-[12px] font-medium transition-colors ${
                    showHistory ? 'bg-foreground text-white border-foreground' : 'border-border hover:bg-muted'
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  Step {cursor + 1} of {history.length}
                </button>
              </div>

              <p className="text-xs text-muted-foreground truncate hidden md:block">
                Now: {current.label}
              </p>

              <div className="ml-auto flex items-center gap-3">
                {busy && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Working
                  </span>
                )}
                <button
                  onClick={download}
                  className={`px-4 py-2 rounded-xl font-semibold text-[13px] transition-all flex items-center justify-center gap-2 ${
                    saved ? 'bg-green-500 text-white' : 'bg-primary hover:bg-primary-hover text-white'
                  }`}
                >
                  {saved ? <><Check className="w-4 h-4" /> Downloaded</> : <><Download className="w-4 h-4" /> Download</>}
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 px-3 py-2 border-b border-border overflow-x-auto shrink-0">
              {TABS.map(({ id, label, icon: Icon }) => {
                const unavailable = locked && id !== 'protect';
                return (
                  <button
                    key={id}
                    onClick={() => { if (!unavailable) { setTab(id); setError(null); } }}
                    disabled={unavailable}
                    title={unavailable ? 'This document is encrypted — step back to keep editing.' : undefined}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium whitespace-nowrap transition-colors ${
                      tab === id ? 'bg-foreground text-white' : 'text-foreground hover:bg-muted'
                    } disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                  </button>
                );
              })}
            </div>

            {error && (
              <div className="px-4 py-2.5 bg-red-50 border-b border-red-200 flex items-start gap-2 shrink-0">
                <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-[13px] text-destructive">{error}</p>
              </div>
            )}

            <div className="flex-1 min-h-0 flex">
              <div className="flex-1 min-w-0 flex flex-col">
                {locked ? (
                  <div className="flex-1 flex items-center justify-center p-8">
                    <div className="max-w-md text-center">
                      <span className="inline-flex w-12 h-12 rounded-2xl bg-muted items-center justify-center mb-4">
                        <Lock className="w-5 h-5 text-foreground" />
                      </span>
                      <h2 className="text-base font-semibold text-foreground mb-1.5">This document is locked</h2>
                      <p className="text-[13px] text-muted-foreground leading-relaxed">
                        An encrypted PDF cannot be opened again without its password, so the other tools stop
                        here. Download it now, or step back to carry on editing and protect it at the end.
                      </p>
                      <div className="flex items-center justify-center gap-2 mt-5">
                        <button
                          onClick={download}
                          className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white font-semibold text-[13px] inline-flex items-center gap-2 transition-colors"
                        >
                          <Download className="w-4 h-4" /> Download
                        </button>
                        <button
                          onClick={() => step(cursor - 1)}
                          className="px-4 py-2 rounded-xl border border-border hover:bg-muted font-medium text-[13px] inline-flex items-center gap-2 transition-colors"
                        >
                          <Undo2 className="w-4 h-4" /> Step back
                        </button>
                      </div>
                    </div>
                  </div>
                ) : tab === 'edit' ? (
                  <PdfEditor
                    key={current.id}
                    file={current.file}
                    onSave={saveEdited}
                    saveLabel="Apply changes"
                    savedLabel="Applied"
                    heightClass="h-full"
                  />
                ) : panelProps && tab === 'redact' ? (
                  <RedactPanel key={current.id} {...panelProps} />
                ) : panelProps && tab === 'pages' ? (
                  <PagesPanel key={current.id} {...panelProps} />
                ) : panelProps && tab === 'sign' ? (
                  <SignPanel key={current.id} {...panelProps} />
                ) : panelProps && tab === 'stamp' ? (
                  <StampPanel key={current.id} {...panelProps} />
                ) : panelProps && tab === 'adjust' ? (
                  <AdjustPanel key={current.id} {...panelProps} />
                ) : panelProps ? (
                  <ProtectPanel key={current.id} {...panelProps} />
                ) : null}
              </div>

              {showHistory && (
                <aside className="w-64 shrink-0 border-l border-border flex flex-col bg-white">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                    <h2 className="text-[12px] font-semibold text-foreground">History</h2>
                    <button
                      onClick={() => setShowHistory(false)}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label="Close history"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <ol className="flex-1 overflow-y-auto p-2 space-y-1">
                    {history.map((version, index) => (
                      <li key={version.id}>
                        <button
                          onClick={() => step(index)}
                          disabled={busy}
                          className={`w-full text-left px-2.5 py-2 rounded-lg transition-colors ${
                            index === cursor ? 'bg-foreground text-white' : 'hover:bg-muted'
                          } ${index > cursor ? 'opacity-50' : ''}`}
                        >
                          <span className="block text-[12px] font-medium truncate">{version.label}</span>
                          <span className={`block text-[11px] tabular-nums ${index === cursor ? 'text-white/60' : 'text-muted-foreground'}`}>
                            {version.pages} pp · {formatSize(version.size)}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ol>
                  <p className="px-3 py-2 border-t border-border text-[11px] text-muted-foreground leading-snug">
                    Every step is a real PDF. Pick any one to go back to it — applying something new from
                    there replaces what came after.
                  </p>
                </aside>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
