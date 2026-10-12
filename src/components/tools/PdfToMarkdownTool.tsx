'use client';

import { useState } from 'react';
import ToolPage from '@/components/ToolPage';
import { pdfToMarkdown } from '@/lib/pdf-engine';
import { useT } from '@/i18n/I18nProvider';

export default function PdfToMarkdownTool() {
  const t = useT();
  const [markdown, setMarkdown] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  return (
    <ToolPage
      slug="pdf-to-markdown"
      accept=".pdf"
      processLabel={t('Convert to Markdown')}
      onProcess={async (files) => {
        const md = await pdfToMarkdown(files[0]);
        setMarkdown(md);
        setShowPreview(true);
        return new Blob([md], { type: 'text/markdown' });
      }}
    >
      {showPreview && markdown && (
        <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-border max-h-80 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-foreground">{t('Preview')}</h3>
            <button
              onClick={() => {
                navigator.clipboard.writeText(markdown);
              }}
              className="text-xs text-primary hover:text-primary-hover font-medium"
            >
              {t('Copy to clipboard')}
            </button>
          </div>
          <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed">
            {markdown.substring(0, 3000)}
            {markdown.length > 3000 && `\n\n${t('... (truncated for preview)')}`}
          </pre>
        </div>
      )}
    </ToolPage>
  );
}
