'use client';

import { useState, useCallback } from 'react';
import { ArrowLeft, Loader2, Lock, Eye, EyeOff, AlertCircle, CheckCircle2, Shield, Settings2 } from 'lucide-react';
import Link from 'next/link';
import FileUpload from '@/components/FileUpload';
import { protectPdf, downloadBlob, getOutputFilename } from '@/lib/pdf-engine';
import { friendlyError } from '@/lib/errors';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(2)} MB`;
}

export default function ProtectPdfTool() {
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ size: number } | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const [userPassword, setUserPassword] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [showUserPw, setShowUserPw] = useState(false);
  const [showOwnerPw, setShowOwnerPw] = useState(false);

  const [allowPrint, setAllowPrint] = useState(true);
  const [allowModifying, setAllowModifying] = useState(true);
  const [allowCopying, setAllowCopying] = useState(true);
  const [allowAnnotating, setAllowAnnotating] = useState(true);
  const [allowFillingForms, setAllowFillingForms] = useState(true);
  const [allowExtraction, setAllowExtraction] = useState(true);
  const [allowAssembly, setAllowAssembly] = useState(true);

  const handleProtect = useCallback(async () => {
    if (files.length === 0) return;
    if (!userPassword && !ownerPassword) {
      setError('Please enter at least one password (user or owner).');
      return;
    }
    setProcessing(true);
    setError(null);
    setResult(null);
    try {
      const blob = await protectPdf(files[0], userPassword || ownerPassword, ownerPassword || undefined, {
        allowPrinting: allowPrint,
        allowModifying,
        allowCopying,
        allowAnnotating,
        allowFillingForms,
        allowExtraction,
        allowAssembly,
      });
      downloadBlob(blob, getOutputFilename('protect-pdf', '-protected.pdf'));
      setResult({ size: blob.size });
    } catch (err: any) {
      setError(friendlyError(err));
    } finally {
      setProcessing(false);
    }
  }, [files, userPassword, ownerPassword, allowPrint, allowModifying, allowCopying, allowAnnotating, allowFillingForms, allowExtraction, allowAssembly]);

  const applyPreset = (p: { print: boolean; modify: boolean; copy: boolean; annotate: boolean; forms: boolean; extract: boolean; assemble: boolean }) => {
    setAllowPrint(p.print);
    setAllowModifying(p.modify);
    setAllowCopying(p.copy);
    setAllowAnnotating(p.annotate);
    setAllowFillingForms(p.forms);
    setAllowExtraction(p.extract);
    setAllowAssembly(p.assemble);
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to all tools
        </Link>

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-amber-50"><Shield className="w-6 h-6 text-amber-500" /></div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Protect PDF</h1>
              <p className="text-muted-foreground text-sm sm:text-base">Encrypt your PDF with password protection and permission controls</p>
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

          {files.length > 0 && !result && (
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

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">User password (opens the PDF)</label>
                  <div className="relative">
                    <input type={showUserPw ? 'text' : 'password'} value={userPassword}
                      onChange={(e) => setUserPassword(e.target.value)}
                      placeholder="Enter user password"
                      className="w-full px-4 py-3 pr-10 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                    <button type="button" onClick={() => setShowUserPw(!showUserPw)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground">
                      {showUserPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">Owner password (controls permissions)</label>
                  <div className="relative">
                    <input type={showOwnerPw ? 'text' : 'password'} value={ownerPassword}
                      onChange={(e) => setOwnerPassword(e.target.value)}
                      placeholder="Enter owner password"
                      className="w-full px-4 py-3 pr-10 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                    <button type="button" onClick={() => setShowOwnerPw(!showOwnerPw)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground">
                      {showOwnerPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <button onClick={() => setShowSettings(!showSettings)}
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                <Settings2 className="w-4 h-4" /> {showSettings ? 'Hide' : 'Show'} advanced permission settings
              </button>

              {showSettings && (
                <div className="space-y-4 p-5 bg-gray-50 rounded-xl border border-border animate-fade-in">
                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs font-semibold text-muted-foreground mr-2">Presets:</span>
                    <button onClick={() => applyPreset({ print: true, modify: true, copy: true, annotate: true, forms: true, extract: true, assemble: true })}
                      className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-gray-50">No restrictions</button>
                    <button onClick={() => applyPreset({ print: true, modify: false, copy: false, annotate: false, forms: false, extract: false, assemble: false })}
                      className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-gray-50">Read-only</button>
                    <button onClick={() => applyPreset({ print: false, modify: false, copy: false, annotate: false, forms: false, extract: false, assemble: false })}
                      className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-gray-50">Maximum security</button>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    {[
                      { checked: allowPrint, onChange: setAllowPrint, label: 'Allow printing' },
                      { checked: allowCopying, onChange: setAllowCopying, label: 'Allow copying text' },
                      { checked: allowModifying, onChange: setAllowModifying, label: 'Allow modifications' },
                      { checked: allowAnnotating, onChange: setAllowAnnotating, label: 'Allow annotations' },
                      { checked: allowFillingForms, onChange: setAllowFillingForms, label: 'Allow form filling' },
                      { checked: allowExtraction, onChange: setAllowExtraction, label: 'Allow content extraction' },
                      { checked: allowAssembly, onChange: setAllowAssembly, label: 'Allow document assembly' },
                    ].map(({ checked, onChange, label }) => (
                      <label key={label} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-border cursor-pointer hover:bg-gray-50/50">
                        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)}
                          className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary/20" />
                        <span className="text-sm text-foreground">{label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              {processing && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3 animate-fade-in">
                  <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                  <p className="text-sm font-medium text-amber-800">Encrypting PDF...</p>
                </div>
              )}

              <button onClick={handleProtect} disabled={processing || !files.length}
                className="px-8 py-3.5 rounded-xl font-semibold text-sm transition-all flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white hover:shadow-lg hover:shadow-amber-500/25 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed">
                {processing ? <><Loader2 className="w-4 h-4 animate-spin" /> Protecting...</> : <><Lock className="w-4 h-4" /> Protect PDF</>}
              </button>
            </div>
          )}

          {result && (
            <div className="mt-6 space-y-4 animate-fade-in">
              <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                <p className="text-sm text-green-800"><span className="font-semibold">PDF protected and downloaded</span> ({formatBytes(result.size)}).</p>
              </div>
              <button onClick={() => { setResult(null); setFiles([]); }}
                className="px-5 py-2.5 rounded-xl text-sm font-medium border border-border hover:bg-gray-50 transition-colors">
                Protect Another
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
