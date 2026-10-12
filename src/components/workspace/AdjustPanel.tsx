'use client';

import { useState } from 'react';
import { Crop, Minimize2, AlertTriangle } from 'lucide-react';
import { cropPdf, optimizePdf, compressToTargetSize } from '@/lib/pdf-engine';
import { formatSize } from '@/lib/workspace';
import { useT } from '@/i18n/I18nProvider';
import { PanelHeader, ApplyButton, Field, inputClass, type PanelProps } from './shared';

type Mode = 'crop' | 'compress';

/** Trimming the page, and trimming the file. */
export default function AdjustPanel({ file, busy, apply }: PanelProps) {
  const t = useT();
  const [mode, setMode] = useState<Mode>('crop');
  const [margins, setMargins] = useState({ top: 40, bottom: 40, left: 40, right: 40 });
  const [target, setTarget] = useState(Math.max(0.1, Math.round((file.size / (1024 * 1024)) * 5) / 10));
  const [lossless, setLossless] = useState(true);
  const [note, setNote] = useState<string | null>(null);

  const run = async () => {
    setNote(null);
    if (mode === 'crop') {
      return apply(() => cropPdf(file, margins), t('Cropped pages'));
    }

    if (lossless) {
      return apply(async () => {
        const result = await optimizePdf(file, { stripMetadata: true });
        setNote(t('{before} → {after} with nothing rasterised.', { before: formatSize(result.originalSize), after: formatSize(result.optimizedSize) }));
        return result.blob;
      }, t('Compressed losslessly'));
    }

    return apply(async () => {
      const result = await compressToTargetSize(file, Math.round(target * 1024 * 1024), (message) => setNote(t(message)));
      setNote(
        result.achieved
          ? t('{before} → {after}.', { before: formatSize(result.originalSize), after: formatSize(result.compressedSize) })
          : t('Got down to {size} — the target was out of reach without ruining the pages.', { size: formatSize(result.compressedSize) }),
      );
      return result.blob;
    }, t('Compressed to {size} MB', { size: target }));
  };

  return (
    <>
      <PanelHeader
        title={t('Adjust')}
        hint={t('Crop the margins away, or bring the file size down.')}
        action={
          <ApplyButton onClick={run} busy={busy}>
            {mode === 'crop' ? t('Crop pages') : t('Compress')}
          </ApplyButton>
        }
      />

      <div className="flex-1 min-h-0 overflow-auto p-6">
        <div className="max-w-lg space-y-5">
          <div className="flex gap-1.5">
            {([['crop', t('Crop'), Crop], ['compress', t('Compress'), Minimize2]] as const).map(([value, label, Icon]) => (
              <button
                key={value}
                onClick={() => { setMode(value); setNote(null); }}
                className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-medium border transition-colors ${
                  mode === value ? 'bg-foreground text-white border-foreground' : 'border-border hover:bg-muted'
                }`}
              >
                <Icon className="w-3.5 h-3.5" /> {label}
              </button>
            ))}
          </div>

          {mode === 'crop' ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                {([['top', t('Top')], ['bottom', t('Bottom')], ['left', t('Left')], ['right', t('Right')]] as const).map(([side, label]) => (
                  <Field key={side} label={label}>
                    <input
                      type="number" min={0} max={500} value={margins[side]}
                      onChange={(e) => setMargins(m => ({ ...m, [side]: Math.max(0, Number(e.target.value) || 0) }))}
                      className={inputClass}
                    />
                  </Field>
                ))}
              </div>
              <p className="text-[12px] text-muted-foreground">
                {t('In points — 72 to the inch. Each value is taken off that edge of every page.')}
              </p>
            </>
          ) : (
            <>
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={lossless}
                  onChange={(e) => setLossless(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-[color:var(--primary)]"
                />
                <span>
                  <span className="block text-[13px] font-medium text-foreground">{t('Lossless only')}</span>
                  <span className="block text-[12px] text-muted-foreground">
                    {t('Rebuilds the file without touching the pages. Text stays selectable and images stay sharp, but the saving is modest.')}
                  </span>
                </span>
              </label>

              {!lossless && (
                <>
                  <Field label={t('Target size (MB)')} hint={t('This document is {size}.', { size: formatSize(file.size) })}>
                    <input
                      type="number" min={0.05} step={0.1} value={target}
                      onChange={(e) => setTarget(Math.max(0.05, Number(e.target.value) || 0.5))}
                      className={inputClass}
                    />
                  </Field>
                  <p className="text-[12px] text-amber-700 flex items-start gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>
                      {t('Hitting a target means rasterising the pages: a searchable text layer is kept, but the words stop being real text and can no longer be edited or redacted. Do this last.')}
                    </span>
                  </p>
                </>
              )}
            </>
          )}

          {note && <p className="text-[12px] text-muted-foreground">{note}</p>}
        </div>
      </div>
    </>
  );
}
