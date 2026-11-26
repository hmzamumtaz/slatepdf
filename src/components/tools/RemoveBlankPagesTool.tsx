'use client';

import { useState, useCallback, useEffect } from 'react';
import ToolPage from '@/components/ToolPage';
import { findBlankPages, removeBlankPages } from '@/lib/pdf-engine';
import { useT } from '@/i18n/I18nProvider';

type Sensitivity = 'strict' | 'balanced' | 'lenient';

const THRESHOLDS: Record<Sensitivity, number> = {
  strict: 0.0005,
  balanced: 0.002,
  lenient: 0.005,
};

/**
 * Drop the blank pages from a scanned PDF. The blank pages are detected
 * when a file is added (and again when the sensitivity changes) and listed
 * before anything is removed, so the user sees exactly what will go.
 */
export default function RemoveBlankPagesTool() {
  const t = useT();
  const [sensitivity, setSensitivity] = useState<Sensitivity>('balanced');
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [blankPages, setBlankPages] = useState<number[] | null>(null);
  const [checking, setChecking] = useState(false);

  const handleFilesSelected = useCallback(async (files: File[]) => {
    if (files[0]) {
      setCurrentFile(files[0]);
      setBlankPages(null);
    }
  }, []);

  useEffect(() => {
    if (!currentFile) return;
    let cancelled = false;
    setChecking(true);
    setBlankPages(null);
    findBlankPages(currentFile, THRESHOLDS[sensitivity])
      .then(pages => { if (!cancelled) setBlankPages(pages); })
      .catch(() => { if (!cancelled) setBlankPages([]); })
      .finally(() => { if (!cancelled) setChecking(false); });
    return () => { cancelled = true; };
  }, [currentFile, sensitivity]);

  return (
    <ToolPage
      slug="remove-blank-pages"
      accept=".pdf"
      processLabel={t('Remove Blank Pages')}
      onFilesSelected={handleFilesSelected}
      options={
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">{t('Sensitivity')}</label>
            <div className="flex gap-2">
              {(['strict', 'balanced', 'lenient'] as Sensitivity[]).map(s => (
                <button
                  key={s}
                  onClick={() => setSensitivity(s)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${sensitivity === s ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                >
                  {s === 'strict' ? t('Strict') : s === 'balanced' ? t('Balanced') : t('Lenient')}
                </button>
              ))}
            </div>
          </div>
          {checking && <p className="text-xs text-muted-foreground">{t('Checking pages…')}</p>}
          {!checking && blankPages !== null && blankPages.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {t('{count} blank pages will be removed: {pages}', { count: blankPages.length, pages: blankPages.join(', ') })}
            </p>
          )}
          {!checking && blankPages !== null && blankPages.length === 0 && (
            <p className="text-xs text-muted-foreground">{t('No blank pages found.')}</p>
          )}
        </div>
      }
      onProcess={async (files) => removeBlankPages(files[0], THRESHOLDS[sensitivity])}
    />
  );
}
