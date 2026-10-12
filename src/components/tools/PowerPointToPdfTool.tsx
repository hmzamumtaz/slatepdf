'use client';

import { useState } from 'react';
import ToolPage from '@/components/ToolPage';
import { renderPptxToPdf } from '@/lib/pptx-render';
import { assertExpectedInput } from '@/lib/input-guard';
import { useT } from '@/i18n/I18nProvider';

export default function PowerPointToPdfTool() {
  const t = useT();
  const [status, setStatus] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);

  return (
    <ToolPage
      slug="powerpoint-to-pdf"
      accept=".pptx"
      processLabel={t('Convert to PDF')}
      options={
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {t('Each slide is redrawn on a white page at its original size — text with its real position, size and colour, plus pictures, tables and grouped shapes.')}
          </p>
          {status && <p className="text-xs font-medium text-blue-600">{t(status)}</p>}
          {summary && <p className="text-xs font-medium text-green-600">{summary}</p>}
        </div>
      }
      onProcess={async (files) => {
        assertExpectedInput(files[0], {
          extensions: ['.pptx'],
          label: 'a PowerPoint presentation',
          counterpart: { extensions: ['.pdf'], toolName: 'PDF to PowerPoint', does: 'turn a PDF into editable slides' },
        });
        setSummary(null);
        const res = await renderPptxToPdf(files[0], (s, total) => setStatus(t('Rendering slide {current} of {total}...', { current: s, total })));
        setStatus(null);
        const vars = { slides: res.slides, images: res.images };
        setSummary(res.images === 0
          ? (res.slides === 1 ? t('Converted {slides} slide.', vars) : t('Converted {slides} slides.', vars))
          : res.images === 1
            ? (res.slides === 1 ? t('Converted {slides} slide including {images} image.', vars) : t('Converted {slides} slides including {images} image.', vars))
            : (res.slides === 1 ? t('Converted {slides} slide including {images} images.', vars) : t('Converted {slides} slides including {images} images.', vars)));
        return new Blob([res.bytes as unknown as BlobPart], { type: 'application/pdf' });
      }}
    />
  );
}
