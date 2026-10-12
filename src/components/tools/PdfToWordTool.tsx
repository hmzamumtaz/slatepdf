'use client';

import ToolPage from '@/components/ToolPage';
import { pdfToWord } from '@/lib/pdf-engine';
import { assertExpectedInput } from '@/lib/input-guard';
import { useT } from '@/i18n/I18nProvider';

export default function PdfToWordTool() {
  const t = useT();
  return (
    <ToolPage
      slug="pdf-to-word"
      accept=".pdf"
      processLabel={t('Convert to Word')}
      onProcess={async (files) => {
        assertExpectedInput(files[0], { extensions: ['.pdf'], label: 'a PDF', counterpart: { extensions: ['.docx', '.doc'], toolName: 'Word to PDF', does: 'turn a document into a PDF' } });
        return pdfToWord(files[0]);
      }}
    />
  );
}
