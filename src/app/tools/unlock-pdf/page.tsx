'use client';

import { useState, useCallback, useRef } from 'react';
import { ArrowLeft, Loader2, Unlock, AlertCircle, CheckCircle2, Eye, EyeOff, KeyRound } from 'lucide-react';
import Link from 'next/link';
import FileUpload from '@/components/FileUpload';
import { unlockPdf, OpenPasswordRequiredError, downloadBlob, getOutputFilename } from '@/lib/pdf-engine';

type Stage = 'idle' | 'working' | 'needs-password' | 'done';

const messageOf = (err: unknown, fallback: string) =>
  err instanceof Error && err.message ? err.message : fallback;

export default function UnlockPdfPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [stage, setStage] = useState<Stage>('idle');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<File | null>(null);

  const run = useCallback(async (file: File, pw: string) => {
    setStage('working');
    setError(null);
    try {
      const blob = await unlockPdf(file, pw);
      downloadBlob(blob, getOutputFilename('unlock-pdf', '.pdf'));
      setStage('done');
    } catch (err) {
      if (err instanceof OpenPasswordRequiredError) {
        setStage('needs-password');
        // Only surface the message as an error once a wrong attempt was made.
        if (pw) setError(err.message);
      } else {
        setStage('idle');
        setError(messageOf(err, 'Could not unlock this PDF. Please try another file.'));
      }
    }
  }, []);

  const handleFilesSelected = useCallback((selected: File[]) => {
    if (selected.length === 0) return;
    const file = selected[0];
    setFiles([file]);
    fileRef.current = file;
    setPassword('');
    setError(null);
    // No prompt: try to strip protection straight away. Owner/permissions locks
    // come off with no password at all; only a true open password stops here.
    void run(file, '');
  }, [run]);

  const handleReset = useCallback(() => {
    setFiles([]);
    setStage('idle');
    setPassword('');
    setError(null);
    fileRef.current = null;
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to all tools
        </Link>

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-amber-50">
              <Unlock className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Unlock PDF</h1>
              <p className="text-muted-foreground text-sm sm:text-base">
                Drop a PDF and it unlocks — no password needed for print, copy and edit restrictions.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-border p-6 sm:p-8 shadow-sm">
          <FileUpload
            accept=".pdf"
            multiple={false}
            files={files}
            onFilesSelected={handleFilesSelected}
            onRemoveFile={handleReset}
          />

          {stage === 'working' && (
            <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3 animate-fade-in">
              <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
              <p className="text-sm font-medium text-amber-800">Removing protection…</p>
            </div>
          )}

          {stage === 'needs-password' && (
            <div className="mt-6 space-y-4 max-w-md animate-fade-in">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                <KeyRound className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-800 mb-1">This file needs a password to open</p>
                  <p className="text-sm text-amber-700">
                    Its contents are encrypted, so it cannot be opened — and therefore cannot be unlocked —
                    without the password that opens it. That is different from a print/copy/edit restriction,
                    which comes off on its own. Enter the open password to remove it.
                  </p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Open password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && password && fileRef.current) void run(fileRef.current, password); }}
                    placeholder="Enter the PDF password"
                    className="w-full px-4 py-2.5 pr-10 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button
                onClick={() => { if (password && fileRef.current) void run(fileRef.current, password); }}
                disabled={!password}
                className="px-8 py-3.5 rounded-xl font-semibold text-sm transition-all flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white hover:shadow-lg hover:shadow-amber-500/25 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Unlock className="w-4 h-4" /> Unlock PDF
              </button>
            </div>
          )}

          {stage === 'done' && (
            <div className="mt-6 p-5 bg-green-50 border border-green-200 rounded-xl animate-fade-in">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-green-800 mb-1">PDF unlocked</p>
                  <p className="text-sm text-green-700">
                    The unlocked file has been downloaded. It opens without a password and its
                    print, copy and edit restrictions are gone.
                  </p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <p className="mt-6 text-xs text-muted-foreground leading-relaxed">
            Restrictions on printing, copying and editing are set by an owner password the reader is not
            expected to have; they are removed here with no password. A password that is required just to
            open the file encrypts its contents and cannot be bypassed — that one has to be entered.
            Everything runs in your browser; the file is never uploaded.
          </p>
        </div>
      </div>
    </div>
  );
}
