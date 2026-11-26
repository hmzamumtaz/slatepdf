'use client';

import { useState } from 'react';
import ToolPage from '@/components/ToolPage';
import { extractTextFromPdf } from '@/lib/pdf-engine';
import { useT } from '@/i18n/I18nProvider';

export default function PdfToTextTool() {
  const t = useT();
  const [headings, setHeadings] = useState(true);
  const [text, setText] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  return (
    <ToolPage
      slug="pdf-to-text"
      accept=".pdf"
      processLabel={t('Convert to Text')}
      options={
        <div className="space-y-4">
          <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={headings}
              onChange={(e) => setHeadings(e.target.checked)}
              className="w-4 h-4 accent-black"
            />
            {t('Add a heading for each page')}
          </label>
          <p className="text-xs text-muted-foreground">{t('The text of every page is saved as one plain .txt file. Scanned pages with no text layer come out empty — run OCR PDF on those first.')}</p>
        </div>
      }
      onProcess={async (files) => {
        const pages = await extractTextFromPdf(files[0]);
        const out = headings
          ? pages.map((p, i) => `--- Page ${i + 1} ---\n${p}`).join('\n\n')
          : pages.join('\n\n');
        setText(out);
        setShowPreview(true);
        return new Blob([out], { type: 'text/plain' });
      }}
    >
      {showPreview && text && (
        <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-border max-h-80 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-foreground">{t('Preview')}</h3>
            <button
              onClick={() => { navigator.clipboard.writeText(text); }}
              className="text-xs text-primary hover:text-primary-hover font-medium"
            >
              {t('Copy to clipboard')}
            </button>
          </div>
          <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed">
            {text.substring(0, 3000)}
            {text.length > 3000 && `\n\n${t('... (truncated for preview)')}`}
          </pre>
        </div>
      )}
    </ToolPage>
  );
}
