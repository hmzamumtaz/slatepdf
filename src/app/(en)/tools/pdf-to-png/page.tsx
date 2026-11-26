import type { Metadata } from 'next';
import ToolPageSEO from '@/components/ToolPageSEO';
import { generateToolMetadata, getToolFaqs } from '@/lib/tool-seo';
import { generateToolPageSchema, generateFAQSchema } from '@/lib/schema';
import { getToolBySlug } from '@/lib/tools-data';
import PdfToPngTool from '@/components/tools/PdfToPngTool';

export async function generateMetadata(): Promise<Metadata> {
  return generateToolMetadata('pdf-to-png');
}

export default function PdfToPngToolPage() {
  const tool = getToolBySlug('pdf-to-png');
  const faqs = getToolFaqs('pdf-to-png');

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateToolPageSchema({ name: tool!.name, description: tool!.description, slug: 'pdf-to-png', category: tool!.category })) }} />
      {faqs.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateFAQSchema(faqs)) }} />}
      <PdfToPngTool />
      <ToolPageSEO slug="pdf-to-png" />
    </>
  );
}
