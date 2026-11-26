'use client';

import { useState } from 'react';
import ToolPage from '@/components/ToolPage';
import { addHeaderFooterToFile } from '@/lib/pdf-engine';
import { useT } from '@/i18n/I18nProvider';

type Position = 'left' | 'center' | 'right';

export default function HeaderFooterTool() {
  const t = useT();
  const [header, setHeader] = useState('');
  const [footer, setFooter] = useState('');
  const [position, setPosition] = useState<Position>('center');
  const [fontSize, setFontSize] = useState(10);
  const [showPageNumbers, setShowPageNumbers] = useState(true);

  const input = (label: string, value: string, onChange: (v: string) => void, placeholder: string) => (
    <div>
      <label className="block text-sm font-medium text-foreground mb-2">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
      />
    </div>
  );

  return (
    <ToolPage
      slug="header-footer"
      accept=".pdf"
      processLabel={t('Add Header & Footer')}
      options={
        <div className="space-y-4">
          {input(t('Header text'), header, setHeader, t('e.g. Confidential — ACME Ltd'))}
          {input(t('Footer text'), footer, setFooter, t('e.g. Draft — do not distribute'))}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">{t('Position')}</label>
            <div className="flex gap-2">
              {(['left', 'center', 'right'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setPosition(p)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${position === p ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                >
                  {p === 'left' ? t('Left') : p === 'right' ? t('Right') : t('Center')}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">{t('Font size')}</label>
            <div className="flex gap-2">
              {[8, 10, 12, 14].map(s => (
                <button
                  key={s}
                  onClick={() => setFontSize(s)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${fontSize === s ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={showPageNumbers}
              onChange={(e) => setShowPageNumbers(e.target.checked)}
              className="w-4 h-4 accent-black"
            />
            {t('Add page numbers to the footer')}
          </label>
          <p className="text-xs text-muted-foreground">{t('Leave the header or footer empty to stamp only the other one. The text is added on top of every page — it does not move the existing content.')}</p>
        </div>
      }
      onProcess={async (files) => addHeaderFooterToFile(files[0], { header: header || undefined, footer: footer || undefined, fontSize, showPageNumbers, position })}
    />
  );
}
