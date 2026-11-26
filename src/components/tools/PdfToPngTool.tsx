'use client';

import { useState } from 'react';
import ToolPage from '@/components/ToolPage';
import { pdfToImages } from '@/lib/pdf-engine';
import { useT } from '@/i18n/I18nProvider';

/**
 * PDF to PNG: every page as a PNG image. The same engine path as PDF to
 * JPG (pdfToImages with format 'png') — a dedicated page for the "pdf to
 * png" search, not a duplicate implementation.
 */
export default function PdfToPngTool() {
  const t = useT();
  const [dpi, setDpi] = useState<'standard' | 'high'>('high');

  return (
    <ToolPage
      slug="pdf-to-png"
      accept=".pdf"
      processLabel={t('Convert to PNG')}
      options={
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">{t('Resolution')}</label>
            <div className="flex gap-2">
              <button onClick={() => setDpi('standard')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${dpi === 'standard' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>{t('Standard (144 DPI)')}</button>
              <button onClick={() => setDpi('high')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${dpi === 'high' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>{t('High (216 DPI)')}</button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{t('Multiple pages download together as a single ZIP.')}</p>
        </div>
      }
      onProcess={async (files) => pdfToImages(files[0], { format: 'png', quality: 0.95, scale: dpi === 'high' ? 3 : 2 })}
    />
  );
}
