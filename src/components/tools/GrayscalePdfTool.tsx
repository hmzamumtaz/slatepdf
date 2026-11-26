'use client';

import ToolPage from '@/components/ToolPage';
import { grayscalePdf } from '@/lib/pdf-engine';
import { useT } from '@/i18n/I18nProvider';

/** Turn a colour PDF black and white, page by page. */
export default function GrayscalePdfTool() {
  const t = useT();

  return (
    <ToolPage
      slug="grayscale-pdf"
      accept=".pdf"
      processLabel={t('Convert to Grayscale')}
      options={
        <p className="text-xs text-muted-foreground">{t('Pages are rebuilt as black-and-white images, so text is no longer selectable in the output.')}</p>
      }
      onProcess={async (files) => grayscalePdf(files[0])}
    />
  );
}
