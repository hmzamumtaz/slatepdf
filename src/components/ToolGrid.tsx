'use client';

import Link from 'next/link';
import * as LucideIcons from 'lucide-react';
/** A tool card; `href` defaults to the English tool page. */
export interface ToolCard {
  slug: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  href?: string;
}

export default function ToolGrid({ tools }: { tools: ToolCard[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {tools.map((tool) => {
        const IconComponent = (LucideIcons as any)[tool.icon] || LucideIcons.FileText;
        return (
          <Link
            key={tool.slug}
            href={tool.href ?? `/tools/${tool.slug}`}
            className="tool-card group p-4 bg-white border border-border rounded-xl hover:border-primary/30 transition-all"
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-transform group-hover:scale-110"
              style={{ backgroundColor: `${tool.color}12` }}
            >
              <IconComponent className="w-5 h-5" style={{ color: tool.color }} />
            </div>
            <h3 className="text-sm font-semibold text-foreground mb-1 leading-tight">{tool.name}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{tool.description}</p>
          </Link>
        );
      })}
    </div>
  );
}
