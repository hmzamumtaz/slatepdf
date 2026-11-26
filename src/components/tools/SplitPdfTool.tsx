'use client';

import { useState, useMemo, useCallback } from 'react';
import ToolPage from '@/components/ToolPage';
import PdfPreview from '@/components/PdfPreview';
import { splitPdf, splitEveryNPages, splitPdfBySize, splitPdfByBookmarks, getPdfInfo, getPdfBookmarks, type PdfBookmark } from '@/lib/pdf-engine';
import { useT } from '@/i18n/I18nProvider';
import { msg } from '@/i18n/format';

type SplitMode = 'ranges' | 'every-n' | 'by-size' | 'by-bookmark';

export default function SplitPdfTool() {
  const t = useT();
  const [mode, setMode] = useState<SplitMode>('ranges');
  const [ranges, setRanges] = useState('');
  const [everyN, setEveryN] = useState(1);
  const [sizeMb, setSizeMb] = useState(5);
  const [pdfInfo, setPdfInfo] = useState<{ totalPages: number } | null>(null);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [bookmarks, setBookmarks] = useState<PdfBookmark[] | null>(null);

  const handleFilesSelected = useCallback(async (files: File[]) => {
    if (files[0]) {
      setCurrentFile(files[0]);
      setBookmarks(null);
      try {
        const info = await getPdfInfo(files[0]);
        setPdfInfo({ totalPages: info.pageCount });
        setRanges(`1-${info.pageCount}`);
      } catch {
        setPdfInfo(null);
      }
      try {
        setBookmarks(await getPdfBookmarks(files[0]));
      } catch {
        setBookmarks([]);
      }
    }
  }, []);

  const parseRanges = (input: string): { start: number; end: number }[] => {
    return input.split(',').map(part => {
      const trimmed = part.trim();
      if (trimmed.includes('-')) {
        const [start, end] = trimmed.split('-').map(Number);
        return { start, end };
      }
      const num = Number(trimmed);
      return { start: num, end: num };
    }).filter(r => !isNaN(r.start) && !isNaN(r.end));
  };

  const previewPages = useMemo(() => {
    if (!pdfInfo) return [];
    const parsed = parseRanges(ranges);
    const pages: number[] = [];
    for (const r of parsed) {
      for (let p = r.start; p <= r.end; p++) {
        if (p >= 1 && p <= pdfInfo.totalPages && !pages.includes(p)) {
          pages.push(p);
        }
      }
    }
    return pages;
  }, [pdfInfo, ranges]);

  return (
    <ToolPage
      slug="split-pdf"
      accept=".pdf"
      multiple={false}
      processLabel={t('Split PDF')}
      onFilesSelected={handleFilesSelected}
      options={
        <div>
          <div className="flex flex-wrap gap-2 mb-4">
            {([
              ['ranges', t('Page ranges')],
              ['every-n', t('Every N pages')],
              ['by-size', t('By file size')],
              ['by-bookmark', t('By bookmark')],
            ] as [SplitMode, string][]).map(([m, label]) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${mode === m ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
              >
                {label}
              </button>
            ))}
          </div>
          {mode === 'ranges' && (
            <>
              <label className="block text-sm font-medium text-foreground mb-2">
                {t('Page ranges (e.g., 1-3, 5, 7-10)')}
              </label>
              <input
                type="text"
                value={ranges}
                onChange={(e) => setRanges(e.target.value)}
                placeholder="1-3, 5, 7-10"
                className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              {pdfInfo && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {t('Total pages: {total} | Pages in ranges: {count}', { total: pdfInfo.totalPages, count: previewPages.length })}
                </p>
              )}
            </>
          )}
          {mode === 'every-n' && (
            <>
              <label className="block text-sm font-medium text-foreground mb-2">
                {t('Pages per file')}
              </label>
              <input
                type="number"
                min={1}
                value={everyN}
                onChange={(e) => setEveryN(Math.max(1, Number(e.target.value) || 1))}
                className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              {pdfInfo && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {t('Total pages: {total} | Files: {count}', { total: pdfInfo.totalPages, count: Math.ceil(pdfInfo.totalPages / everyN) })}
                </p>
              )}
            </>
          )}
          {mode === 'by-size' && (
            <>
              <label className="block text-sm font-medium text-foreground mb-2">
                {t('Maximum size per file (MB)')}
              </label>
              <input
                type="number"
                min={1}
                value={sizeMb}
                onChange={(e) => setSizeMb(Math.max(1, Number(e.target.value) || 1))}
                className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                {t('Pages are grouped so each file stays under this size. A single page bigger than the limit goes in a file on its own.')}
              </p>
            </>
          )}
          {mode === 'by-bookmark' && (
            <>
              {bookmarks === null ? (
                <p className="mt-2 text-xs text-muted-foreground">{t('Loading bookmarks…')}</p>
              ) : bookmarks.length === 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">{t('This PDF has no bookmarks.')}</p>
              ) : (
                <>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {t("One file per bookmark, from that bookmark's page to the next.")}
                  </p>
                  <ul className="mt-2 space-y-1">
                    {bookmarks.map((b, i) => (
                      <li key={i} className="text-xs text-muted-foreground flex justify-between gap-2">
                        <span className="truncate">{b.title}</span>
                        <span className="shrink-0">{t('Page {page}', { page: b.page })}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </>
          )}
          {currentFile && previewPages.length > 0 && mode === 'ranges' && (
            <PdfPreview
              file={currentFile}
              pageNumbers={previewPages}
              label={t('Preview of pages in ranges:')}
            />
          )}
        </div>
      }
      onProcess={async (files) => {
        if (mode === 'every-n') return splitEveryNPages(files[0], everyN);
        if (mode === 'by-size') return splitPdfBySize(files[0], sizeMb * 1024 * 1024);
        if (mode === 'by-bookmark') return splitPdfByBookmarks(files[0]);
        const parsed = parseRanges(ranges);
        if (parsed.length === 0) throw new Error(msg('Please enter valid page ranges'));
        return splitPdf(files[0], parsed);
      }}
    />
  );
}
