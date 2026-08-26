'use client';

import ToolPage from '@/components/ToolPage';
import { jpgToPdf } from '@/lib/pdf-engine';

export default function WebpToPdfTool() {
  return (
    <ToolPage
      slug="webp-to-pdf"
      multiple
      accept="image/webp"
      processLabel="Convert to PDF"
      onProcess={async (files) => jpgToPdf(files)}
    />
  );
}
