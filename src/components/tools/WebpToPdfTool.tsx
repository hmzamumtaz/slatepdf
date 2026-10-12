'use client';

import ToolPage from '@/components/ToolPage';
import { jpgToPdf } from '@/lib/pdf-engine';
import { useT } from '@/i18n/I18nProvider';

export default function WebpToPdfTool() {
  const t = useT();
  return (
    <ToolPage
      slug="webp-to-pdf"
      multiple
      accept="image/webp"
      processLabel={t('Convert to PDF')}
      onProcess={async (files) => jpgToPdf(files)}
    />
  );
}
