'use client';

import ToolPage from '@/components/ToolPage';
import { extractImagesFromPdf } from '@/lib/pdf-engine';
import { useT } from '@/i18n/I18nProvider';

export default function ExtractImagesTool() {
  const t = useT();

  return (
    <ToolPage
      slug="extract-images"
      accept=".pdf"
      processLabel={t('Extract Images')}
      options={
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">{t('Photos, logos and figures embedded in the PDF are saved as PNG files. Multiple images download together as a single ZIP.')}</p>
        </div>
      }
      onProcess={async (files) => {
        const images = await extractImagesFromPdf(files[0]);
        if (images.length === 0) throw new Error('No embedded images were found in this PDF.');
        return images.map(i => i.blob);
      }}
    />
  );
}
