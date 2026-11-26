'use client';

import { useState } from 'react';
import ToolPage from '@/components/ToolPage';
import { addBatesNumbersToFile } from '@/lib/pdf-engine';
import { useT } from '@/i18n/I18nProvider';

type Position = 'bottom-center' | 'bottom-left' | 'bottom-right' | 'top-center' | 'top-left' | 'top-right';

export default function BatesNumberingTool() {
  const t = useT();
  const [prefix, setPrefix] = useState('');
  const [start, setStart] = useState(1);
  const [digits, setDigits] = useState(5);
  const [position, setPosition] = useState<Position>('bottom-right');

  const preview = `${prefix}${String(start).padStart(digits, '0')}`;

  return (
    <ToolPage
      slug="bates-numbering"
      accept=".pdf"
      processLabel={t('Apply Bates Numbers')}
      options={
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">{t('Prefix')}</label>
            <input
              type="text"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              placeholder={t('e.g. EXHIBIT-')}
              className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">{t('Start number')}</label>
            <input
              type="number"
              min={0}
              value={start}
              onChange={(e) => setStart(Math.max(0, Number(e.target.value) || 0))}
              className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">{t('Digits')}</label>
            <div className="flex gap-2">
              {[3, 4, 5, 6].map(d => (
                <button
                  key={d}
                  onClick={() => setDigits(d)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${digits === d ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">{t('Position')}</label>
            <div className="flex flex-wrap gap-2">
              {(['bottom-left', 'bottom-center', 'bottom-right', 'top-left', 'top-center', 'top-right'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setPosition(p)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${position === p ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                >
                  {p === 'bottom-left' ? t('Bottom left') : p === 'bottom-center' ? t('Bottom center') : p === 'bottom-right' ? t('Bottom right') : p === 'top-left' ? t('Top left') : p === 'top-center' ? t('Top center') : t('Top right')}
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{t('First page will be stamped: {preview}', { preview })}</p>
        </div>
      }
      onProcess={async (files) => addBatesNumbersToFile(files[0], { prefix, start, digits, position })}
    />
  );
}
