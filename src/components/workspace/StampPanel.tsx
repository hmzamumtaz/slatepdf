'use client';

import { useState } from 'react';
import { Droplets, Hash } from 'lucide-react';
import {
  addWatermarkToFile, addPageNumbersToFile, type PageNumberFormat,
} from '@/lib/pdf-engine';
import { PanelHeader, ApplyButton, Field, inputClass, type PanelProps } from './shared';

type Mode = 'watermark' | 'numbers';

const POSITIONS = [
  'bottom-center', 'bottom-left', 'bottom-right',
  'top-center', 'top-left', 'top-right',
] as const;

const FORMATS: { value: PageNumberFormat; label: string }[] = [
  { value: 'n', label: '1' },
  { value: 'page-n', label: 'Page 1' },
  { value: 'n-of-m', label: '1 of 10' },
];

/** Marks that go on every page: a watermark, or page numbers. */
export default function StampPanel({ file, busy, apply }: PanelProps) {
  const [mode, setMode] = useState<Mode>('watermark');

  const [text, setText] = useState('CONFIDENTIAL');
  const [fontSize, setFontSize] = useState(50);
  const [opacity, setOpacity] = useState(0.3);
  const [rotation, setRotation] = useState(-45);

  const [position, setPosition] = useState<(typeof POSITIONS)[number]>('bottom-center');
  const [start, setStart] = useState(1);
  const [format, setFormat] = useState<PageNumberFormat>('n');

  const run = () => {
    if (mode === 'watermark') {
      return apply(
        () => addWatermarkToFile(file, text, { fontSize, opacity, rotation }),
        `Watermarked “${text}”`,
      );
    }
    return apply(
      () => addPageNumbersToFile(file, position, start, format),
      'Added page numbers',
    );
  };

  return (
    <>
      <PanelHeader
        title="Stamp"
        hint="Put a watermark or page numbers on every page."
        action={
          <ApplyButton onClick={run} disabled={mode === 'watermark' && !text.trim()} busy={busy}>
            {mode === 'watermark' ? 'Add watermark' : 'Add page numbers'}
          </ApplyButton>
        }
      />

      <div className="flex-1 min-h-0 overflow-auto p-6">
        <div className="max-w-lg space-y-5">
          <div className="flex gap-1.5">
            {([['watermark', 'Watermark', Droplets], ['numbers', 'Page numbers', Hash]] as const).map(([value, label, Icon]) => (
              <button
                key={value}
                onClick={() => setMode(value)}
                className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-medium border transition-colors ${
                  mode === value ? 'bg-foreground text-white border-foreground' : 'border-border hover:bg-muted'
                }`}
              >
                <Icon className="w-3.5 h-3.5" /> {label}
              </button>
            ))}
          </div>

          {mode === 'watermark' ? (
            <div className="space-y-4">
              <Field label="Watermark text">
                <input value={text} onChange={(e) => setText(e.target.value)} className={inputClass} />
              </Field>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Size">
                  <input
                    type="number" min={8} max={200} value={fontSize}
                    onChange={(e) => setFontSize(Math.min(200, Math.max(8, Number(e.target.value) || 50)))}
                    className={inputClass}
                  />
                </Field>
                <Field label="Opacity">
                  <input
                    type="number" min={0.05} max={1} step={0.05} value={opacity}
                    onChange={(e) => setOpacity(Math.min(1, Math.max(0.05, Number(e.target.value) || 0.3)))}
                    className={inputClass}
                  />
                </Field>
                <Field label="Angle">
                  <input
                    type="number" min={-90} max={90} value={rotation}
                    onChange={(e) => setRotation(Math.min(90, Math.max(-90, Number(e.target.value) || 0)))}
                    className={inputClass}
                  />
                </Field>
              </div>
              <div className="bg-gray-100 rounded-xl h-40 flex items-center justify-center overflow-hidden">
                <span
                  className="font-bold text-gray-500 whitespace-nowrap"
                  style={{
                    opacity,
                    fontSize: Math.max(12, fontSize * 0.5),
                    transform: `rotate(${rotation}deg)`,
                  }}
                >
                  {text || 'CONFIDENTIAL'}
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Field label="Position">
                <select
                  value={position}
                  onChange={(e) => setPosition(e.target.value as (typeof POSITIONS)[number])}
                  className={inputClass}
                >
                  {POSITIONS.map(p => (
                    <option key={p} value={p}>{p.replace('-', ' ')}</option>
                  ))}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Start at">
                  <input
                    type="number" min={0} value={start}
                    onChange={(e) => setStart(Math.max(0, Number(e.target.value) || 1))}
                    className={inputClass}
                  />
                </Field>
                <Field label="Style">
                  <select
                    value={format}
                    onChange={(e) => setFormat(e.target.value as PageNumberFormat)}
                    className={inputClass}
                  >
                    {FORMATS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </Field>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
