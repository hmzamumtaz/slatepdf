'use client';

import { useState, useCallback } from 'react';
import ToolPage from '@/components/ToolPage';
import { getPdfFormFields, fillPdfForm, type PdfFormFieldInfo } from '@/lib/pdf-engine';
import { useT } from '@/i18n/I18nProvider';

export default function FillPdfFormTool() {
  const t = useT();
  const [fields, setFields] = useState<PdfFormFieldInfo[] | null>(null);
  const [values, setValues] = useState<Record<string, string | boolean>>({});

  const handleFilesSelected = useCallback(async (files: File[]) => {
    if (!files[0]) return;
    try {
      const found = await getPdfFormFields(files[0]);
      setFields(found);
      const initial: Record<string, string | boolean> = {};
      for (const f of found) initial[f.name] = f.value;
      setValues(initial);
    } catch {
      setFields(null);
    }
  }, []);

  const setValue = (name: string, value: string | boolean) =>
    setValues(prev => ({ ...prev, [name]: value }));

  return (
    <ToolPage
      slug="fill-pdf-form"
      accept=".pdf"
      processLabel={t('Save Filled PDF')}
      onFilesSelected={handleFilesSelected}
      options={
        <div className="space-y-4">
          {fields === null && (
            <p className="text-xs text-muted-foreground">{t('Choose a PDF with fillable form fields to see them here.')}</p>
          )}
          {fields !== null && fields.length === 0 && (
            <p className="text-xs text-muted-foreground">{t('This PDF has no fillable form fields. It may be a flat scan or a printed form — fillable fields are the ones a PDF reader lets you type into.')}</p>
          )}
          {fields !== null && fields.length > 0 && fields.map(f => (
            <div key={f.name}>
              <label className="block text-sm font-medium text-foreground mb-2">
                {f.name}{f.required ? ' *' : ''}
              </label>
              {f.type === 'checkbox' ? (
                <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={values[f.name] === true}
                    onChange={(e) => setValue(f.name, e.target.checked)}
                    className="w-4 h-4 accent-black"
                  />
                  {t('Checked')}
                </label>
              ) : f.type === 'dropdown' || f.type === 'radio' ? (
                <select
                  value={String(values[f.name] ?? '')}
                  onChange={(e) => setValue(f.name, e.target.value)}
                  className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
                >
                  <option value="">{t('Choose…')}</option>
                  {(f.options ?? []).map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : f.type === 'text' ? (
                <input
                  type="text"
                  value={String(values[f.name] ?? '')}
                  onChange={(e) => setValue(f.name, e.target.value)}
                  className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              ) : (
                <p className="text-xs text-muted-foreground">{t('This field type cannot be filled here.')}</p>
              )}
            </div>
          ))}
          {fields !== null && fields.length > 0 && (
            <p className="text-xs text-muted-foreground">{t('The filled values are saved into the PDF. Use Flatten PDF afterwards if the answers should no longer be editable.')}</p>
          )}
        </div>
      }
      onProcess={async (files) => fillPdfForm(files[0], values)}
    />
  );
}
