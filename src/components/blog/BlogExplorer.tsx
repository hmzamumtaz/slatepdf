'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronDown, Clock, FolderTree, PenTool, RefreshCw, Search, ShieldCheck, TrendingDown, Wrench, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { BlogCategory } from '@/lib/blog';

export interface BlogCard {
  slug: string;
  title: string;
  description: string;
  category: BlogCategory;
  date: string;
  minutes: number;
}

const CATEGORY_META: Record<BlogCategory, { icon: LucideIcon; color: string; blurb: string }> = {
  'Merging & Organizing': { icon: FolderTree, color: '#0ea5e9', blurb: 'Combine, split, reorder and organize pages' },
  Converting: { icon: RefreshCw, color: '#7c3aed', blurb: 'Move to, from and between PDF and other formats' },
  Compressing: { icon: TrendingDown, color: '#06b6d4', blurb: 'Shrink file size without losing quality' },
  'Security & Privacy': { icon: ShieldCheck, color: '#16a34a', blurb: 'Passwords, redaction and private sharing' },
  'Editing & Signing': { icon: PenTool, color: '#1d4ed8', blurb: 'Edit text, add signatures and annotations' },
  Troubleshooting: { icon: Wrench, color: '#f97316', blurb: 'Fix PDFs that misbehave or will not open' },
};

const COLLAPSE_AT = 9;

export default function BlogExplorer({ cards, categories }: { cards: BlogCard[]; categories: BlogCategory[] }) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState<BlogCategory | 'All'>('All');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const term = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!term && active === 'All') return cards;
    return cards.filter((c) => {
      const catOk = active === 'All' || c.category === active;
      if (!catOk) return false;
      if (!term) return true;
      return (
        c.title.toLowerCase().includes(term) ||
        c.description.toLowerCase().includes(term) ||
        c.slug.replace(/-/g, ' ').includes(term)
      );
    });
  }, [cards, term, active]);

  const groups = useMemo(
    () => categories.map((cat) => ({ category: cat, posts: filtered.filter((c) => c.category === cat) })),
    [categories, filtered],
  );

  const counts = useMemo(() => {
    const map = new Map<BlogCategory, number>();
    for (const c of cards) map.set(c.category, (map.get(c.category) ?? 0) + 1);
    return map;
  }, [cards]);

  const toggle = (cat: string) => setExpanded((prev) => ({ ...prev, [cat]: !prev[cat] }));

  return (
    <div>
      <div className="sticky top-16 z-30 bg-gray-50/90 backdrop-blur-lg py-4 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 border-b border-border/60 mb-8">
        <div className="relative max-w-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search guides — e.g. merge, sign, compress…"
            aria-label="Search guides"
            className="w-full rounded-xl border border-border bg-white pl-11 pr-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-shadow"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActive('All')}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all ${
              active === 'All'
                ? 'bg-foreground text-background border-foreground'
                : 'bg-white border-border text-muted-foreground hover:border-gray-300 hover:text-foreground'
            }`}
          >
            All guides
            <span className="text-xs opacity-70">{cards.length}</span>
          </button>
          {categories.map((cat) => {
            const Icon = CATEGORY_META[cat].icon;
            const color = CATEGORY_META[cat].color;
            const isActive = active === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActive(isActive ? 'All' : cat)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all ${
                  isActive
                    ? 'text-white border-transparent'
                    : 'bg-white border-border text-muted-foreground hover:border-gray-300 hover:text-foreground'
                }`}
                style={isActive ? { backgroundColor: color } : undefined}
              >
                <Icon className="w-3.5 h-3.5" style={{ color: isActive ? undefined : color }} />
                {cat}
                <span className="text-xs opacity-70">{counts.get(cat) ?? 0}</span>
              </button>
            );
          })}
        </div>

        <p className="text-sm text-muted-foreground mt-3" aria-live="polite">
          {filtered.length > 0
            ? `Showing ${filtered.length} of ${cards.length} guides${active !== 'All' ? ` in ${active}` : ''}${term ? ` matching “${query.trim()}”` : ''}`
            : 'No matches'}
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-white p-12 text-center">
          <p className="font-semibold text-foreground mb-1">No guides found</p>
          <p className="text-sm text-muted-foreground mb-4">Try a different keyword or clear the filters.</p>
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setActive('All');
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-foreground text-background px-4 py-2 text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Clear search and filters
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(({ category, posts: groupPosts }) => {
            if (groupPosts.length === 0) return null;
            const meta = CATEGORY_META[category];
            const Icon = meta.icon;
            const isOpen = expanded[category] ?? false;
            const visible = isOpen ? groupPosts : groupPosts.slice(0, COLLAPSE_AT);
            return (
              <section key={category} className="rounded-2xl border border-border bg-white overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 sm:px-6 py-4">
                  <div className="flex items-center gap-3">
                    <span
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${meta.color}14` }}
                    >
                      <Icon className="w-5 h-5" style={{ color: meta.color }} />
                    </span>
                    <div>
                      <h2 className="font-bold text-foreground leading-tight">{category}</h2>
                      <p className="text-xs text-muted-foreground">{meta.blurb}</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ backgroundColor: `${meta.color}14`, color: meta.color }}>
                    {groupPosts.length} {groupPosts.length === 1 ? 'guide' : 'guides'}
                  </span>
                </div>

                <ul>
                  {visible.map((post, i) => (
                    <li key={post.slug}>
                      <Link
                        href={`/blog/${post.slug}`}
                        className={`flex items-center gap-3 px-5 sm:px-6 py-3 group transition-colors ${i !== 0 ? 'border-t border-border/70' : ''}`}
                      >
                        <span className="flex-1 min-w-0">
                          <span className="block text-[15px] font-medium text-gray-800 group-hover:text-foreground transition-colors">{post.title}</span>
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                          <Clock className="w-3.5 h-3.5" />
                          {post.minutes} min
                        </span>
                        <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                      </Link>
                    </li>
                  ))}
                </ul>

                {groupPosts.length > COLLAPSE_AT && (
                  <button
                    type="button"
                    onClick={() => toggle(category)}
                    className="w-full flex items-center justify-center gap-1.5 border-t border-border px-4 py-3 text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                  >
                    <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    {isOpen ? 'Show fewer' : `Show all ${groupPosts.length} guides`}
                  </button>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}