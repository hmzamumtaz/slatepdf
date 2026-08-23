'use client';

import { useState } from 'react';
import { Lock, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { protectPdf } from '@/lib/pdf-engine';
import { PanelHeader, ApplyButton, Field, inputClass, type PanelProps } from './shared';

const PERMISSIONS = [
  { key: 'allowPrinting', label: 'Printing' },
  { key: 'allowCopying', label: 'Copying text' },
  { key: 'allowModifying', label: 'Changing the document' },
  { key: 'allowAnnotating', label: 'Comments and mark-up' },
] as const;

/**
 * The last step, and deliberately so: once a document is encrypted nothing else
 * in the workspace can read it, so this hands over to the download.
 */
export default function ProtectPanel({ file, busy, apply }: PanelProps) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [visible, setVisible] = useState(false);
  const [allowed, setAllowed] = useState<Record<string, boolean>>({
    allowPrinting: true,
    allowCopying: false,
    allowModifying: false,
    allowAnnotating: false,
  });

  const mismatch = confirm.length > 0 && password !== confirm;
  const ready = password.length >= 4 && password === confirm;

  const run = () => apply(
    () => protectPdf(file, password, undefined, allowed),
    'Password protected',
  );

  return (
    <>
      <PanelHeader
        title="Protect"
        hint="Lock the finished document with a password. This is the last step."
        action={
          <ApplyButton onClick={run} disabled={!ready} busy={busy}>
            <Lock className="w-4 h-4" /> Protect
          </ApplyButton>
        }
      />

      <div className="flex-1 min-h-0 overflow-auto p-6">
        <div className="max-w-lg space-y-5">
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <p className="text-[12px] text-amber-800 leading-snug">
              An encrypted PDF cannot be read back without its password, so the other tabs stop here.
              Finish everything else first, protect, then download. Stepping back in the history undoes it.
            </p>
          </div>

          <Field label="Password" hint="At least four characters. There is no way to recover it.">
            <div className="relative">
              <input
                type={visible ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setVisible(v => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={visible ? 'Hide password' : 'Show password'}
              >
                {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </Field>

          <Field label="Confirm password">
            <input
              type={visible ? 'text' : 'password'}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={inputClass}
              autoComplete="new-password"
            />
          </Field>
          {mismatch && <p className="text-[12px] text-destructive">The two passwords do not match.</p>}

          <div>
            <p className="text-[12px] font-medium text-foreground mb-2">Allow without the password</p>
            <div className="space-y-2">
              {PERMISSIONS.map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowed[key] ?? false}
                    onChange={(e) => setAllowed(prev => ({ ...prev, [key]: e.target.checked }))}
                    className="w-4 h-4 accent-[color:var(--primary)]"
                  />
                  <span className="text-[13px] text-foreground">{label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
