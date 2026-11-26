'use client';

import { useState } from 'react';
import ToolPage from '@/components/ToolPage';
import { pdfToHtml } from '@/lib/pdf-engine';
import { useT } from '@/i18n/I18nProvider';

export default function PdfToHtmlTool() {
  const t = useT();
  const [html, setHtml] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  return (
    <ToolPage
      slug="pdf-to-html"
      accept=".pdf"
      processLabel={t('Convert to HTML')}
      options={
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">{t('The PDF text becomes a plain HTML page, one section per PDF page. It moves the words, not the layout — images and exact formatting are not carried over.')}</p>
        </div>
      }
      onProcess={async (files) => {
        const out = await pdfToHtml(files[0]);
        setHtml(out);
        setShowPreview(true);
        return new Blob([out], { type: 'text/html' });
      }}
    >
      {showPreview && html && (
        <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-border max-h-80 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-foreground">{t('Preview')}</h3>
            <button
              onClick={() => { navigator.clipboard.writeText(html); }}
              className="text-xs text-primary hover:text-primary-hover font-medium"
            >
              {t('Copy to clipboard')}
            </button>
          </div>
          <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed">
            {html.substring(0, 3000)}
            {html.length > 3000 && `\n\n${t('... (truncated for preview)')}`}
          </pre>
        </div>
      )}
    </ToolPage>
  );
}
