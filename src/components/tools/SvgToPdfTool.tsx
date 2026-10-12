'use client';

import ToolPage from '@/components/ToolPage';
import { svgToPdf } from '@/lib/pdf-engine';
import { useT } from '@/i18n/I18nProvider';

export default function SvgToPdfTool() {
  const t = useT();
  return (
    <ToolPage
      slug="svg-to-pdf"
      multiple
      accept="image/svg+xml"
      processLabel={t('Convert to PDF')}
      onProcess={async (files) => svgToPdf(files)}
    />
  );
}
