'use client';

import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { toolIcon } from '@/components/tool-icons';
/** A tool card; `href` defaults to the English tool page. `badge` marks a
    card with a small label (e.g. "Popular") in the top-right corner. */
export interface ToolCard {
  slug: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  href?: string;
  badge?: string;
}

export default function ToolGrid({ tools }: { tools: ToolCard[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {tools.map((tool) => {
        const IconComponent = toolIcon(tool.icon);
        return (
          <Link
            key={tool.slug}
            href={tool.href ?? `/tools/${tool.slug}`}
            className="tool-card group relative p-4 bg-white border border-border rounded-2xl hover:border-foreground/25"
          >
            {tool.badge && (
              <span className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-foreground text-white text-[10px] font-bold tracking-wide uppercase">
                {tool.badge}
              </span>
            )}
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center mb-3 transition-transform group-hover:scale-110"
              style={{ backgroundColor: `${tool.color}12` }}
            >
              <IconComponent className="w-5 h-5" style={{ color: tool.color }} />
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-1 leading-tight pr-4">{tool.name}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{tool.description}</p>
            <ArrowUpRight className="w-4 h-4 text-muted-foreground absolute bottom-3 right-3 opacity-0 -translate-x-1 translate-y-1 group-hover:opacity-100 group-hover:translate-0 transition-all" />
          </Link>
        );
      })}
    </div>
  );
}
