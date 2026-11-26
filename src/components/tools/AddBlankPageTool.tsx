'use client';

import { useState, useCallback } from 'react';
import ToolPage from '@/components/ToolPage';
import { insertBlankPages, insertPagesFromFile, getPdfInfo } from '@/lib/pdf-engine';
import { useT } from '@/i18n/I18nProvider';

type Mode = 'blank' | 'insert';
type Position = 'start' | 'end' | 'every' | 'page';

/**
 * Insert pages Organize PDF cannot: a blank page (at the start, at the
 * end, after every page, or after a chosen page) or every page of a second
 * PDF, dropped in after a chosen page.
 */
export default function AddBlankPageTool() {
  const t = useT();
  const [mode, setMode] = useState<Mode>('blank');
  const [position, setPosition] = useState<Position>('end');
  const [afterPage, setAfterPage] = useState(1);
  const [pageCount, setPageCount] = useState<number | null>(null);

  const handleFilesSelected = useCallback(async (files: File[]) => {
    if (files[0]) {
      try {
        const info = await getPdfInfo(files[0]);
        setPageCount(info.pageCount);
        setAfterPage(info.pageCount);
      } catch {
        setPageCount(null);
      }
    }
  }, []);

  const positions: Position[] = mode === 'blank'
    ? ['start', 'end', 'every', 'page']
    : ['start', 'end', 'page'];

  return (
    <ToolPage
      slug="add-blank-page"
      accept=".pdf"
      processLabel={t('Add Blank Page')}
      processAllTogether
      minFiles={mode === 'insert' ? 2 : 1}
      minFilesMessage={t('Add the PDF to insert pages from.')}
      onFilesSelected={handleFilesSelected}
      options={
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">{t('What to insert')}</label>
            <div className="flex gap-2">
              <button
                onClick={() => setMode('blank')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${mode === 'blank' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
              >
                {t('Blank page')}
              </button>
              <button
                onClick={() => { setMode('insert'); if (position === 'every') setPosition('end'); }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${mode === 'insert' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
              >
                {t('Pages from another PDF')}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">{t('Position')}</label>
            <div className="flex flex-wrap gap-2">
              {positions.map(p => (
                <button
                  key={p}
                  onClick={() => setPosition(p)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${position === p ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                >
                  {p === 'start' ? t('At the start') : p === 'end' ? t('At the end') : p === 'every' ? t('After every page') : t('After page')}
                </button>
              ))}
            </div>
          </div>
          {position === 'page' && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">{t('After page number')}</label>
              <input
                type="number"
                min={1}
                max={pageCount ?? undefined}
                value={afterPage}
                onChange={(e) => setAfterPage(Math.max(1, Number(e.target.value) || 1))}
                className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              {pageCount !== null && (
                <p className="mt-2 text-xs text-muted-foreground">{t('Total pages: {total}', { total: pageCount })}</p>
              )}
            </div>
          )}
          {mode === 'insert' && (
            <p className="text-xs text-muted-foreground">{t('Add the PDF to insert as a second file, after the first one.')}</p>
          )}
        </div>
      }
      onProcess={async (files) => {
        const total = (await getPdfInfo(files[0])).pageCount;
        if (mode === 'blank') {
          if (position === 'every') {
            return insertBlankPages(files[0], Array.from({ length: total }, (_, i) => i + 1));
          }
          const after = position === 'start' ? 0 : position === 'end' ? total : Math.min(afterPage, total);
          return insertBlankPages(files[0], [after]);
        }
        const after = position === 'start' ? 0 : position === 'end' ? total : Math.min(afterPage, total);
        return insertPagesFromFile(files[0], files[1], after);
      }}
    />
  );
}
