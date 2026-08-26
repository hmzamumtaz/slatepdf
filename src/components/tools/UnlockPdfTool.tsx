'use client';

import { useState, useCallback } from 'react';
import { ArrowLeft, Loader2, LockOpen, AlertCircle, CheckCircle2, FileDown, Info } from 'lucide-react';
import Link from 'next/link';
import FileUpload from '@/components/FileUpload';
import { unlockPdf, downloadBlob, getOutputFilename } from '@/lib/pdf-engine';
import { friendlyError } from '@/lib/errors';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(2)} MB`;
}

export default function UnlockPdfTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [password, setPassword] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ size: number } | null>(null);

  const handleUnlock = useCallback(async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setError(null);
    setResult(null);
    try {
      const blob = await unlockPdf(files[0], password || undefined);
      downloadBlob(blob, getOutputFilename('unlock-pdf', '-unlocked.pdf'));
      setResult({ size: blob.size });
    } catch (err: any) {
      setError(friendlyError(err));
    } finally {
      setProcessing(false);
    }
  }, [files, password]);

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to all tools
        </Link>

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-emerald-50"><LockOpen className="w-6 h-6 text-emerald-500" /></div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Unlock PDF</h1>
              <p className="text-muted-foreground text-sm sm:text-base">Remove password protection from a PDF file</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-border p-6 sm:p-8 shadow-sm">
          <FileUpload
            accept=".pdf"
            multiple={false}
            files={files}
            onFilesSelected={(f) => { setFiles(f); setResult(null); setError(null); }}
            onRemoveFile={() => { setFiles([]); setResult(null); }}
          />

          {files.length > 0 && (
            <div className="mt-6 space-y-5">
              <div className="p-4 bg-gray-50 rounded-xl border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">File</span>
                  <span className="text-sm font-medium text-foreground">{files[0].name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Size</span>
                  <span className="text-sm font-medium text-foreground">{formatBytes(files[0].size)}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-foreground mb-2">Password (if required)</label>
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter the PDF password (leave empty if none)"
                  className="w-full px-4 py-3 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl flex items-start gap-2.5">
                <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-xs text-emerald-800 leading-relaxed">
                  Only PDFs you own or have permission to modify should be used. Removing security
                  from someone else's PDF may violate copyright or privacy laws.
                </p>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              {result && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3 animate-fade-in">
                  <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                  <p className="text-sm text-green-800"><span className="font-semibold">PDF unlocked and downloaded</span> ({formatBytes(result.size)}).</p>
                </div>
              )}

              <button onClick={handleUnlock} disabled={processing || !files.length}
                className="px-8 py-3.5 rounded-xl font-semibold text-sm transition-all flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white hover:shadow-lg hover:shadow-emerald-500/25 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed">
                {processing ? <><Loader2 className="w-4 h-4 animate-spin" /> Unlocking...</> : <><FileDown className="w-4 h-4" /> Unlock PDF</>}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
