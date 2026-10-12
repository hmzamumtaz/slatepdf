'use client';

import { useState } from 'react';
import ToolPage from '@/components/ToolPage';
import { pdfToPowerpointStructured } from '@/lib/pdf-to-pptx';
import { assertExpectedInput } from '@/lib/input-guard';
import { useT } from '@/i18n/I18nProvider';

export default function PdfToPowerPointTool() {
  const t = useT();
  const [status, setStatus] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);

  return (
    <ToolPage
      slug="pdf-to-powerpoint"
      accept=".pdf"
      processLabel={t('Convert to PowerPoint')}
      options={
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {t("Reads the document's structure — headings become slide titles and paragraphs become bullet points — instead of pasting raw text. Long pages continue onto extra slides.")}
          </p>
          {status && <p className="text-xs font-medium text-blue-600">{t(status)}</p>}
          {summary && <p className="text-xs font-medium text-green-600">{summary}</p>}
        </div>
      }
      onProcess={async (files) => {
        assertExpectedInput(files[0], {
          extensions: ['.pdf'],
          label: 'a PDF',
          counterpart: { extensions: ['.pptx', '.ppt'], toolName: 'PowerPoint to PDF', does: 'turn slides into a PDF' },
        });
        setSummary(null);
        const res = await pdfToPowerpointStructured(files[0], (p, total) => setStatus(t('Reading page {current} of {total}...', { current: p, total })));
        setStatus(null);
        const vars = { slides: res.slides, pages: res.pages };
        setSummary(res.slides === 1
          ? (res.pages === 1 ? t('Built {slides} slide from {pages} page.', vars) : t('Built {slides} slide from {pages} pages.', vars))
          : (res.pages === 1 ? t('Built {slides} slides from {pages} page.', vars) : t('Built {slides} slides from {pages} pages.', vars)));
        return res.blob;
      }}
    />
  );
}
