'use client';

import { useState } from 'react';
import ToolGrid, { type ToolCard } from '@/components/ToolGrid';

export interface ExplorerCategory {
  id: string;
  label: string;
  tools: ToolCard[];
  /** Deep-link anchor kept on the section (footer and tool pages link to it). */
  anchorId?: string;
}

/**
 * The tool browser shared by the English and translated homepages: category
 * tabs (the iLovePDF pattern) above the grid. "All" shows every category
 * section; picking one filters to that category in place.
 */
export default function CategoryExplorer({
  categories,
  allLabel,
}: {
  categories: ExplorerCategory[];
  allLabel: string;
}) {
  const [active, setActive] = useState<string>('all');

  return (
    <div>
      <div
        role="tablist"
        aria-label={allLabel}
        className="sticky top-16 z-30 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-3 bg-white/95 backdrop-blur-lg flex gap-2 overflow-x-auto mb-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <button
          role="tab"
          aria-selected={active === 'all'}
          onClick={() => setActive('all')}
          className="tab-pill shrink-0 px-4 py-2 rounded-full border border-border bg-white text-sm font-semibold text-foreground hover:border-foreground/40"
        >
          {allLabel}
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            role="tab"
            aria-selected={active === c.id}
            onClick={() => setActive(c.id)}
            className="tab-pill shrink-0 px-4 py-2 rounded-full border border-border bg-white text-sm font-semibold text-foreground hover:border-foreground/40"
          >
            {c.label}
          </button>
        ))}
      </div>

      {active === 'all' ? (
        categories.map((c) => (
          <div key={c.id} id={c.anchorId} className="mb-14 last:mb-0 scroll-mt-24">
            <h2 className="text-xl font-bold text-foreground mb-5">{c.label}</h2>
            <ToolGrid tools={c.tools} />
          </div>
        ))
      ) : (
        (() => {
          const c = categories.find((x) => x.id === active)!;
          return (
            <div id={c.anchorId} className="scroll-mt-24">
              <h2 className="text-xl font-bold text-foreground mb-5">{c.label}</h2>
              <ToolGrid tools={c.tools} />
            </div>
          );
        })()
      )}
    </div>
  );
}
