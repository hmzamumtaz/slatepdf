'use client';

import ToolPage from '@/components/ToolPage';
import { tiffToPdf } from '@/lib/pdf-engine';
import { useT } from '@/i18n/I18nProvider';

export default function TiffToPdfTool() {
  const t = useT();
  return (
    <ToolPage
      slug="tiff-to-pdf"
      multiple
      accept="image/tiff,image/tif"
      processLabel={t('Convert to PDF')}
      onProcess={async (files) => tiffToPdf(files)}
    />
  );
}
