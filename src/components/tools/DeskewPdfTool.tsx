'use client';

import { useState, useCallback } from 'react';
import ToolPage from '@/components/ToolPage';
import { deskewPdf, detectSkewAngle } from '@/lib/pdf-engine';
import { useT } from '@/i18n/I18nProvider';

/**
 * Straighten tilted scanned pages. The tilt is auto-detected when a file
 * is added (projection-profile method) and the slider lets the user adjust
 * it by hand — the Live preview shows the straightened first page.
 */
export default function DeskewPdfTool() {
  const t = useT();
  const [angle, setAngle] = useState(0);
  const [detected, setDetected] = useState<number | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [currentFile, setCurrentFile] = useState<File | null>(null);

  const runDetect = useCallback(async (file: File) => {
    setDetecting(true);
    try {
      const found = await detectSkewAngle(file);
      setDetected(found);
      setAngle(found);
    } catch {
      setDetected(null);
    } finally {
      setDetecting(false);
    }
  }, []);

  const handleFilesSelected = useCallback(async (files: File[]) => {
    if (files[0]) {
      setCurrentFile(files[0]);
      setDetected(null);
      setAngle(0);
      void runDetect(files[0]);
    }
  }, [runDetect]);

  return (
    <ToolPage
      slug="deskew-pdf"
      accept=".pdf"
      processLabel={t('Deskew PDF')}
      onFilesSelected={handleFilesSelected}
      options={
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">{t('Straighten by')}</label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={-10}
                max={10}
                step={0.5}
                value={angle}
                onChange={(e) => setAngle(Number(e.target.value))}
                className="flex-1 accent-primary"
              />
              <span className="text-sm font-medium text-foreground tabular-nums w-14 text-right">{angle.toFixed(1)}°</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => currentFile && void runDetect(currentFile)}
              disabled={!currentFile || detecting}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-muted text-foreground hover:bg-muted/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('Auto-detect')}
            </button>
            {detecting && <p className="text-xs text-muted-foreground">{t('Detecting tilt…')}</p>}
            {!detecting && detected !== null && (
              <p className="text-xs text-muted-foreground">{t('Detected tilt: {angle}°', { angle: detected.toFixed(1) })}</p>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{t('Pages are rebuilt as images, so text is no longer selectable in the output. Drag the slider if the page still looks tilted.')}</p>
        </div>
      }
      onProcess={async (files) => deskewPdf(files[0], angle)}
    />
  );
}
