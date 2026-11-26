'use client';

import ToolPage from '@/components/ToolPage';
import { flattenPdf } from '@/lib/pdf-engine';
import { useT } from '@/i18n/I18nProvider';

export default function FlattenPdfTool() {
  const t = useT();

  return (
    <ToolPage
      slug="flatten-pdf"
      accept=".pdf"
      processLabel={t('Flatten PDF')}
      options={
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">{t('Form fields are baked permanently into the page, so filled-in values can no longer be changed. Comments and highlights are removed; links are kept. The text stays selectable — nothing is turned into an image.')}</p>
        </div>
      }
      onProcess={async (files) => flattenPdf(files[0])}
    />
  );
}
