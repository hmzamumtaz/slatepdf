'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { RotateCw, RotateCcw, Trash2, Undo2, ArrowLeft, ArrowRight, FilePlus2 } from 'lucide-react';
import { renderPdfPreviews, type PagePreview } from '@/lib/pdf-engine';
import { rebuildPages, insertPdf, type PageOp } from '@/lib/workspace';
import { PanelHeader, ApplyButton, Loading, type PanelProps } from './shared';

interface Slot extends PageOp {
  /** Stable across moves, so React keeps the right thumbnail with the right slot. */
  key: number;
  removed: boolean;
}

/**
 * Reorder, turn and drop pages, and splice another PDF in.
 *
 * Every change is held as an instruction against the document as it was opened,
 * and applied in one pass — chaining separate reorder and rotate steps is how
 * you end up turning the wrong page.
 */
export default function PagesPanel({ file, busy, apply }: PanelProps) {
  const [previews, setPreviews] = useState<PagePreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState('');
  const [slots, setSlots] = useState<Slot[]>([]);
  const insertInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const rendered = await renderPdfPreviews(file, { scale: 0.8 }, (p, t) => {
          if (!cancelled) setProgress(`Rendering page ${p} of ${t}…`);
        });
        if (cancelled) return;
        setPreviews(rendered);
        setSlots(rendered.map((_, i) => ({ key: i, source: i, rotate: 0, removed: false })));
      } finally {
        if (!cancelled) { setLoading(false); setProgress(''); }
      }
    })();
    return () => { cancelled = true; };
  }, [file]);

  const kept = useMemo(() => slots.filter(s => !s.removed), [slots]);
  const changed = useMemo(
    () => slots.some((s, i) => s.removed || s.rotate !== 0 || s.source !== i),
    [slots],
  );

  const patch = (key: number, change: Partial<Slot>) =>
    setSlots(prev => prev.map(s => (s.key === key ? { ...s, ...change } : s)));

  const move = (key: number, by: number) => {
    setSlots(prev => {
      const from = prev.findIndex(s => s.key === key);
      const to = from + by;
      if (from === -1 || to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      [next[from], next[to]] = [next[to], next[from]];
      return next;
    });
  };

  const run = () => {
    const summary: string[] = [];
    const removed = slots.filter(s => s.removed).length;
    const turned = kept.filter(s => s.rotate !== 0).length;
    const sources = kept.map(s => s.source);
    const reordered = sources.some((v, i) => i > 0 && v < sources[i - 1]);
    if (removed) summary.push(`removed ${removed} page${removed === 1 ? '' : 's'}`);
    if (turned) summary.push(`turned ${turned} page${turned === 1 ? '' : 's'}`);
    if (reordered) summary.push('reordered pages');

    return apply(
      () => rebuildPages(file, kept.map(({ source, rotate }) => ({ source, rotate }))),
      summary.length ? `Pages: ${summary.join(', ')}` : 'Rebuilt pages',
    );
  };

  const chooseInsert = (e: React.ChangeEvent<HTMLInputElement>) => {
    const incoming = e.target.files?.[0];
    e.target.value = '';
    if (!incoming) return;
    void apply(() => insertPdf(file, incoming, previews.length), `Inserted ${incoming.name}`);
  };

  return (
    <>
      <input ref={insertInput} type="file" accept=".pdf,application/pdf" className="hidden" onChange={chooseInsert} />

      <PanelHeader
        title="Pages"
        hint="Reorder, turn and drop pages, or add another PDF to the end."
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => insertInput.current?.click()}
              disabled={busy}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium border border-border hover:bg-muted transition-colors disabled:opacity-50"
            >
              <FilePlus2 className="w-3.5 h-3.5" /> Add a PDF
            </button>
            {changed && (
              <button
                onClick={() => setSlots(previews.map((_, i) => ({ key: i, source: i, rotate: 0, removed: false })))}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium border border-border hover:bg-muted transition-colors"
              >
                <Undo2 className="w-3 h-3" /> Reset
              </button>
            )}
            <ApplyButton onClick={run} disabled={!changed || kept.length === 0} busy={busy}>
              Apply page changes
            </ApplyButton>
          </div>
        }
      />

      <div className="flex-1 min-h-0 overflow-auto bg-gray-200/70 p-6">
        {loading ? (
          <Loading message={progress || 'Rendering the document…'} />
        ) : (
          <>
            {kept.length === 0 && (
              <p className="text-center text-[13px] text-destructive mb-4">
                A PDF needs at least one page — restore one before applying.
              </p>
            )}
            <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {slots.map((slot, index) => {
                const preview = previews[slot.source];
                const position = kept.findIndex(s => s.key === slot.key);
                return (
                  <li
                    key={slot.key}
                    className={`bg-white rounded-xl border p-2 shadow-sm ${
                      slot.removed ? 'border-destructive/50 opacity-60' : 'border-border'
                    }`}
                  >
                    <div className="relative bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center aspect-[1/1.3]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={preview?.url}
                        alt={`Page ${slot.source + 1}`}
                        className="max-w-full max-h-full object-contain transition-transform"
                        style={{ transform: `rotate(${slot.rotate}deg)` }}
                        draggable={false}
                      />
                      <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/70 text-white text-[10px] tabular-nums">
                        {slot.removed ? 'removed' : position + 1}
                      </span>
                      {slot.source !== index && !slot.removed && (
                        <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-primary text-white text-[10px]">
                          was {slot.source + 1}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-center gap-0.5 mt-2">
                      <button
                        onClick={() => move(slot.key, -1)}
                        disabled={index === 0 || slot.removed}
                        className="w-7 h-7 rounded-md hover:bg-muted disabled:opacity-30 flex items-center justify-center transition-colors"
                        aria-label={`Move page ${slot.source + 1} earlier`}
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => patch(slot.key, { rotate: slot.rotate - 90 })}
                        disabled={slot.removed}
                        className="w-7 h-7 rounded-md hover:bg-muted disabled:opacity-30 flex items-center justify-center transition-colors"
                        aria-label={`Turn page ${slot.source + 1} left`}
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => patch(slot.key, { rotate: slot.rotate + 90 })}
                        disabled={slot.removed}
                        className="w-7 h-7 rounded-md hover:bg-muted disabled:opacity-30 flex items-center justify-center transition-colors"
                        aria-label={`Turn page ${slot.source + 1} right`}
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => patch(slot.key, { removed: !slot.removed })}
                        className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${
                          slot.removed ? 'bg-foreground text-white' : 'hover:bg-muted'
                        }`}
                        aria-label={slot.removed ? `Restore page ${slot.source + 1}` : `Remove page ${slot.source + 1}`}
                      >
                        {slot.removed ? <Undo2 className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => move(slot.key, 1)}
                        disabled={index === slots.length - 1 || slot.removed}
                        className="w-7 h-7 rounded-md hover:bg-muted disabled:opacity-30 flex items-center justify-center transition-colors"
                        aria-label={`Move page ${slot.source + 1} later`}
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </>
  );
}
