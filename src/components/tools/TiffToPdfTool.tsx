'use client';

import ToolPage from '@/components/ToolPage';
import { tiffToPdf } from '@/lib/pdf-engine';

export default function TiffToPdfTool() {
  return (
    <ToolPage
      slug="tiff-to-pdf"
      multiple
      accept="image/tiff,image/tif"
      processLabel="Convert to PDF"
      onProcess={async (files) => tiffToPdf(files)}
    />
  );
}
