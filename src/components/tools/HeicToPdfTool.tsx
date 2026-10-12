'use client';

import ToolPage from '@/components/ToolPage';
import { heicToPdf } from '@/lib/pdf-engine';
import { useT } from '@/i18n/I18nProvider';

export default function HeicToPdfTool() {
  const t = useT();
  return (
    <ToolPage
      slug="heic-to-pdf"
      multiple
      accept="image/heic,image/heif"
      processLabel={t('Convert to PDF')}
      onProcess={async (files) => heicToPdf(files)}
    />
  );
}
