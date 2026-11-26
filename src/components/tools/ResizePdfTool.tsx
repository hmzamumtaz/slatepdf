'use client';

import { useState } from 'react';
import ToolPage from '@/components/ToolPage';
import { resizePdfPages } from '@/lib/pdf-engine';
import { useT } from '@/i18n/I18nProvider';

type Preset = 'A4' | 'Letter' | 'A3' | 'A5' | 'Custom';

/** Page sizes in millimetres; converted to PDF points (1 mm = 72 / 25.4 pt). */
const PRESETS: Record<Exclude<Preset, 'Custom'>, { w: number; h: number }> = {
  A4: { w: 210, h: 297 },
  Letter: { w: 215.9, h: 279.4 },
  A3: { w: 297, h: 420 },
  A5: { w: 148, h: 210 },
};

const MM_TO_PT = 72 / 25.4;

/**
 * Resize every page to A4 / Letter / A3 / A5 or a custom size, scaling the
 * original content to fit. Unlike Crop, which trims margins, this changes
 * the page size itself.
 */
export default function ResizePdfTool() {
  const t = useT();
  const [preset, setPreset] = useState<Preset>('A4');
  const [customW, setCustomW] = useState(210);
  const [customH, setCustomH] = useState(297);

  const sizeMm = preset === 'Custom' ? { w: customW, h: customH } : PRESETS[preset];

  return (
    <ToolPage
      slug="resize-pdf"
      accept=".pdf"
      processLabel={t('Resize Pages')}
      options={
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">{t('Page size')}</label>
            <div className="flex flex-wrap gap-2">
              {(['A4', 'Letter', 'A3', 'A5', 'Custom'] as Preset[]).map(p => (
                <button
                  key={p}
                  onClick={() => setPreset(p)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${preset === p ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                >
                  {p === 'Custom' ? t('Custom') : p}
                </button>
              ))}
            </div>
          </div>
          {preset === 'Custom' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">{t('Width (mm)')}</label>
                <input
                  type="number"
                  min={10}
                  max={1000}
                  value={customW}
                  onChange={(e) => setCustomW(Math.max(10, Number(e.target.value) || 10))}
                  className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">{t('Height (mm)')}</label>
                <input
                  type="number"
                  min={10}
                  max={1000}
                  value={customH}
                  onChange={(e) => setCustomH(Math.max(10, Number(e.target.value) || 10))}
                  className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </div>
          )}
          <p className="text-xs text-muted-foreground">{t('Content is scaled to fit the new size, centred. Text and vectors stay intact.')}</p>
        </div>
      }
      onProcess={async (files) => resizePdfPages(files[0], sizeMm.w * MM_TO_PT, sizeMm.h * MM_TO_PT)}
    />
  );
}
