'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Globe, ChevronDown } from 'lucide-react';
import { ALL_LOCALES, DEFAULT_LOCALE, LOCALE_NAMES } from '@/i18n/config';
import { hrefFor, homeHref, pageFromPath } from '@/i18n/paths';

/**
 * Links to the current page in every language. Pages that only exist in
 * English (blog, legal) link to each language's homepage instead.
 */
export default function LanguageSwitcher({ label, dropUp }: { label: string; dropUp?: boolean }) {
  const pathname = usePathname() ?? '/';
  const current = pageFromPath(pathname);
  const locale = current?.locale ?? DEFAULT_LOCALE;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-label={label}
        className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
      >
        <Globe className="w-4 h-4" />
        <span>{LOCALE_NAMES[locale]}</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ul
          className={`absolute z-50 w-48 bg-white border border-border rounded-xl shadow-xl py-2 end-0 ${dropUp ? 'bottom-full mb-1' : 'top-full mt-1'}`}
        >
          {ALL_LOCALES.map(l => (
            <li key={l}>
              <Link
                href={current ? hrefFor(l, current.page) : homeHref(l)}
                hrefLang={l}
                lang={l}
                onClick={() => setOpen(false)}
                aria-current={l === locale ? 'true' : undefined}
                className={`block px-4 py-2 text-sm hover:bg-muted transition-colors ${l === locale ? 'font-semibold text-foreground' : 'text-gray-600'}`}
              >
                {LOCALE_NAMES[l]}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
