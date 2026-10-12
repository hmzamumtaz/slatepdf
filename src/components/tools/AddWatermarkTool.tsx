'use client';

import { useState } from 'react';
import ToolPage from '@/components/ToolPage';
import { addWatermarkToFile } from '@/lib/pdf-engine';
import { useT } from '@/i18n/I18nProvider';

export default function AddWatermarkTool() {
  const t = useT();
  const [text, setText] = useState('CONFIDENTIAL');
  const [opacity, setOpacity] = useState(0.3);
  const [fontSize, setFontSize] = useState(50);

  return (
    <ToolPage
      slug="add-watermark"
      accept=".pdf"
      processLabel={t('Add Watermark')}
      options={
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">{t('Watermark text')}</label>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t('e.g., CONFIDENTIAL')}
              className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">{t('Opacity: {value}%', { value: Math.round(opacity * 100) })}</label>
              <input
                type="range"
                min="0.05"
                max="1"
                step="0.05"
                value={opacity}
                onChange={(e) => setOpacity(parseFloat(e.target.value))}
                className="w-full accent-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">{t('Font size: {size}px', { size: fontSize })}</label>
              <input
                type="range"
                min="20"
                max="150"
                step="5"
                value={fontSize}
                onChange={(e) => setFontSize(parseInt(e.target.value))}
                className="w-full accent-primary"
              />
            </div>
          </div>
        </div>
      }
      onProcess={async (files) => addWatermarkToFile(files[0], text, { opacity, fontSize })}
    />
  );
}
