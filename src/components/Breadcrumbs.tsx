'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export default function Breadcrumbs({ items, home = { label: 'Home', href: '/' } }: { items: BreadcrumbItem[]; home?: { label: string; href: string } }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        <li>
          <Link href={home.href} className="hover:text-foreground transition-colors">{home.label}</Link>
        </li>
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-1.5">
            <ChevronRight className="w-3 h-3 rtl:rotate-180" />
            {item.href ? (
              <Link href={item.href} className="hover:text-foreground transition-colors">
                {item.label}
              </Link>
            ) : (
              <span className="text-foreground truncate max-w-[16rem]">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
