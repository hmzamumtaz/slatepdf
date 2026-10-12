'use client';

import ToolPage from '@/components/ToolPage';
import { mergePdfs } from '@/lib/pdf-engine';
import { useT } from '@/i18n/I18nProvider';

export default function MergePdfTool() {
  const t = useT();
  return (
    <ToolPage
      slug="merge-pdf"
      accept=".pdf"
      processLabel={t('Merge PDFs')}
      processAllTogether
      minFiles={2}
      minFilesMessage={t('Upload at least 2 PDF files to merge them together.')}
      onProcess={async (files) => mergePdfs(files)}
    />
  );
}
