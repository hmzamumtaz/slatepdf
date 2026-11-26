'use client';

import { useState } from 'react';
import ToolPage from '@/components/ToolPage';
import { jpgToPdf, decodeImageToPng, type JpgToPdfOptions } from '@/lib/pdf-engine';
import { useT } from '@/i18n/I18nProvider';

const PAGE_SIZES: NonNullable<JpgToPdfOptions['pageSize']>[] = [
  'a4',
  'a4-landscape',
  'letter',
  'letter-landscape',
  'legal',
  'original',
];

const MARGINS: NonNullable<JpgToPdfOptions['margin']>[] = ['none', 'small', 'large'];

const chip = (active: boolean) =>
  `px-3 py-1.5 rounded-full border text-sm font-medium transition-colors ${
    active
      ? 'bg-foreground text-white border-foreground'
      : 'bg-white text-foreground border-border hover:border-foreground/40'
  }`;

export default function JpgToPdfTool() {
  const t = useT();
  const [pageSize, setPageSize] = useState<NonNullable<JpgToPdfOptions['pageSize']>>('a4');
  const [margin, setMargin] = useState<NonNullable<JpgToPdfOptions['margin']>>('small');
  const [enlarge, setEnlarge] = useState(false);

  // Labels as literal t() calls so the i18n extractor sees them.
  const pageSizeLabels: Record<NonNullable<JpgToPdfOptions['pageSize']>, string> = {
    a4: t('A4'),
    'a4-landscape': t('A4 landscape'),
    letter: t('Letter'),
    'letter-landscape': t('Letter landscape'),
    legal: t('Legal'),
    original: t('Original size'),
  };
  const marginLabels: Record<NonNullable<JpgToPdfOptions['margin']>, string> = {
    none: t('None'),
    small: t('Small'),
    large: t('Large'),
  };

  return (
    <ToolPage
      slug="jpg-to-pdf"
      multiple
      accept="image/jpeg,image/png,image/webp,image/bmp,image/gif"
      processLabel={t('Convert to PDF')}
      processAllTogether
      options={
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">{t('Page size')}</label>
            <div className="flex flex-wrap gap-2">
              {PAGE_SIZES.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPageSize(value)}
                  aria-pressed={pageSize === value}
                  className={chip(pageSize === value)}
                >
                  {pageSizeLabels[value]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">{t('Margin')}</label>
            <div className="flex flex-wrap gap-2">
              {MARGINS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMargin(value)}
                  aria-pressed={margin === value}
                  className={chip(margin === value)}
                >
                  {marginLabels[value]}
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={enlarge}
              onChange={(e) => setEnlarge(e.target.checked)}
              className="w-4 h-4 accent-foreground"
            />
            {t('Enlarge small images to fill the page')}
          </label>
        </div>
      }
      onProcess={async (files) => {
        // BMP and GIF cannot be embedded directly — decode them to PNG first.
        const ready = await Promise.all(files.map(async f =>
          (f.type === 'image/bmp' || f.type === 'image/gif') ? decodeImageToPng(f) : f,
        ));
        return jpgToPdf(ready, { pageSize, margin, enlarge });
      }}
    />
  );
}
