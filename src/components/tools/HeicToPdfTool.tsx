'use client';

import ToolPage from '@/components/ToolPage';
import { heicToPdf } from '@/lib/pdf-engine';

export default function HeicToPdfTool() {
  return (
    <ToolPage
      slug="heic-to-pdf"
      multiple
      accept="image/heic,image/heif"
      processLabel="Convert to PDF"
      onProcess={async (files) => heicToPdf(files)}
    />
  );
}
