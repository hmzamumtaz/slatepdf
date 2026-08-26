'use client';

import ToolPage from '@/components/ToolPage';
import { svgToPdf } from '@/lib/pdf-engine';

export default function SvgToPdfTool() {
  return (
    <ToolPage
      slug="svg-to-pdf"
      multiple
      accept="image/svg+xml"
      processLabel="Convert to PDF"
      onProcess={async (files) => svgToPdf(files)}
    />
  );
}
