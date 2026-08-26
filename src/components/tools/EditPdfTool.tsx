'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import FileUpload from '@/components/FileUpload';
import PdfEditor from '@/components/PdfEditor';
import { downloadBlob, getOutputFilename } from '@/lib/pdf-engine';

export default function EditPdfTool() {
  const [file, setFile] = useState<File | null>(null);

  const save = useCallback((bytes: Uint8Array) => {
    downloadBlob(
      new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' }),
      getOutputFilename('edit-pdf', '.pdf'),
    );
  }, []);

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 mb-4">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            All tools
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Edit PDF</h1>
          <p className="text-muted-foreground text-[13px]">
            Click any line on the page and type. Everything runs in this tab — your file is never uploaded.
          </p>
        </div>

        {file === null ? (
          <div className="bg-white rounded-2xl border border-border p-6 sm:p-8 shadow-sm max-w-3xl">
            <FileUpload
              accept=".pdf"
              multiple={false}
              files={[]}
              onFilesSelected={(f) => setFile(f[0] ?? null)}
              onRemoveFile={() => setFile(null)}
            />
            <p className="mt-6 text-[13px] text-muted-foreground">
              Editing one file is all this page does. To edit, redact, sign and secure the same document in
              one sitting, use the{' '}
              <Link href="/tools/pdf-workspace" className="text-primary hover:underline font-medium">PDF Workspace</Link>.
            </p>
          </div>
        ) : (
          <PdfEditor
            file={file}
            onSave={save}
            toolbarExtra={
              <button
                onClick={() => setFile(null)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Change
              </button>
            }
          />
        )}
      </div>
    </div>
  );
}
