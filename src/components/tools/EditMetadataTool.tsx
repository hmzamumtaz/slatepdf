'use client';

import { useState, useCallback } from 'react';
import ToolPage from '@/components/ToolPage';
import { getPdfMetadata, editPdfMetadata } from '@/lib/pdf-engine';
import { useT } from '@/i18n/I18nProvider';

export default function EditMetadataTool() {
  const t = useT();
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [subject, setSubject] = useState('');
  const [keywords, setKeywords] = useState('');
  const [loaded, setLoaded] = useState(false);

  const handleFilesSelected = useCallback(async (files: File[]) => {
    if (!files[0]) return;
    try {
      const meta = await getPdfMetadata(files[0]);
      setTitle(meta.title ?? '');
      setAuthor(meta.author ?? '');
      setSubject(meta.subject ?? '');
      setKeywords(meta.keywords ?? '');
      setLoaded(true);
    } catch {
      setLoaded(false);
    }
  }, []);

  const field = (label: string, value: string, onChange: (v: string) => void, placeholder: string) => (
    <div>
      <label className="block text-sm font-medium text-foreground mb-2">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-2.5 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
      />
    </div>
  );

  return (
    <ToolPage
      slug="edit-metadata"
      accept=".pdf"
      processLabel={t('Save Metadata')}
      onFilesSelected={handleFilesSelected}
      options={
        <div className="space-y-4">
          {field(t('Title'), title, setTitle, t('Document title'))}
          {field(t('Author'), author, setAuthor, t('Author name'))}
          {field(t('Subject'), subject, setSubject, t('What the document is about'))}
          {field(t('Keywords'), keywords, setKeywords, t('Comma-separated keywords'))}
          <p className="text-xs text-muted-foreground">
            {loaded
              ? t('The current values are shown above — change what you need and save. Leave a field empty to clear it.')
              : t('Choose a PDF to see its current title, author, subject and keywords.')}
          </p>
        </div>
      }
      onProcess={async (files) => editPdfMetadata(files[0], { title, author, subject, keywords })}
    />
  );
}
