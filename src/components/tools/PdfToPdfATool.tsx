'use client';

import ToolPage from '@/components/ToolPage';
import { convertToPdfA } from '@/lib/pdf-engine';
import { useT } from '@/i18n/I18nProvider';

export default function PdfToPdfATool() {
  const t = useT();
  return (
    <ToolPage
      slug="pdf-to-pdfa"
      accept=".pdf"
      processLabel={t('Convert to PDF/A')}
      onProcess={async (files) => convertToPdfA(files[0])}
    />
  );
}
