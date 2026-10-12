'use client';

import ToolPage from '@/components/ToolPage';
import { jpgToPdf } from '@/lib/pdf-engine';
import { useT } from '@/i18n/I18nProvider';

export default function JpgToPdfTool() {
  const t = useT();
  return (
    <ToolPage
      slug="jpg-to-pdf"
      multiple
      accept="image/jpeg,image/png,image/webp"
      processLabel={t('Convert to PDF')}
      processAllTogether
      onProcess={async (files) => jpgToPdf(files)}
    />
  );
}
