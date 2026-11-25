'use client';

import { BadgeCheck, Lock, UserX, ShieldCheck } from 'lucide-react';
import { useT } from '@/i18n/I18nProvider';

/**
 * The four trust chips under every tool-page title — the pitch, at a glance.
 * Shared by the generic ToolPage header and the tools with custom headers,
 * so all 39 tool pages say the same four facts in the same place.
 */
export default function ToolTrustChips() {
  const t = useT();
  const chips = [
    { icon: BadgeCheck, label: t('Free') },
    { icon: Lock, label: t('No upload') },
    { icon: UserX, label: t('No sign-up') },
    { icon: ShieldCheck, label: t('No watermark') },
  ];
  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <span key={chip.label} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted text-xs font-semibold text-foreground">
          <chip.icon className="w-3.5 h-3.5 text-green-600" />
          {chip.label}
        </span>
      ))}
    </div>
  );
}
