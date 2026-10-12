'use client';

import ToolPage from '@/components/ToolPage';
import { pdfToExcel } from '@/lib/pdf-engine';
import { assertExpectedInput } from '@/lib/input-guard';
import { useT } from '@/i18n/I18nProvider';

export default function PdfToExcelTool() {
  const t = useT();
  return (
    <ToolPage
      slug="pdf-to-excel"
      accept=".pdf"
      processLabel={t('Convert to Excel')}
      onProcess={async (files) => {
        assertExpectedInput(files[0], { extensions: ['.pdf'], label: 'a PDF', counterpart: { extensions: ['.xlsx', '.xls', '.csv'], toolName: 'Excel to PDF', does: 'turn a spreadsheet into a PDF' } });
        return pdfToExcel(files[0]);
      }}
    />
  );
}
