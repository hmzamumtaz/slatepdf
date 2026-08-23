'use client';

import { Loader2 } from 'lucide-react';

/**
 * What every workspace panel is handed.
 *
 * A panel never owns the document. It reads the current one, builds a new one,
 * and hands it back through `apply` — which is what puts it in the history and
 * makes it the file the next panel sees.
 */
export interface PanelProps {
  file: File;
  pages: number;
  busy: boolean;
  apply: (run: () => Promise<Blob>, label: string) => Promise<void>;
}

export function PanelHeader({ title, hint, action }: { title: string; hint: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-3 border-b border-border shrink-0">
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      {action}
    </div>
  );
}

export function ApplyButton({
  onClick, disabled, busy, children,
}: { onClick: () => void; disabled?: boolean; busy?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || busy}
      className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white font-semibold text-[13px] transition-all inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
    >
      {busy && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="block text-[12px] font-medium text-foreground mb-1">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-muted-foreground mt-1">{hint}</span>}
    </label>
  );
}

export const inputClass =
  'w-full px-3 py-2 bg-white border border-border rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary';

export function Loading({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground py-16">
      <Loader2 className="w-4 h-4 animate-spin" />
      {message}
    </div>
  );
}
