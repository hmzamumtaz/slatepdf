'use client';

import { useState } from 'react';
import ToolPage from '@/components/ToolPage';
import { nUpPdf } from '@/lib/pdf-engine';
import { useT } from '@/i18n/I18nProvider';

type Layout = '2-up' | '4-up' | '6-up' | '9-up';

const LAYOUTS: Record<Layout, { cols: number; rows: number }> = {
  '2-up': { cols: 1, rows: 2 },
  '4-up': { cols: 2, rows: 2 },
  '6-up': { cols: 2, rows: 3 },
  '9-up': { cols: 3, rows: 3 },
};

/** Lay 2, 4, 6 or 9 source pages on each sheet, like a booklet. */
export default function NUpPdfTool() {
  const t = useT();
  const [layout, setLayout] = useState<Layout>('2-up');

  return (
    <ToolPage
      slug="n-up-pdf"
      accept=".pdf"
      processLabel={t('Create N-up PDF')}
      options={
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">{t('Pages per sheet')}</label>
            <div className="flex flex-wrap gap-2">
              {(['2-up', '4-up', '6-up', '9-up'] as Layout[]).map(l => (
                <button
                  key={l}
                  onClick={() => setLayout(l)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${layout === l ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{t('Each sheet stays the size of the first page. Text and vectors stay intact.')}</p>
        </div>
      }
      onProcess={async (files) => nUpPdf(files[0], LAYOUTS[layout].cols, LAYOUTS[layout].rows)}
    />
  );
}
