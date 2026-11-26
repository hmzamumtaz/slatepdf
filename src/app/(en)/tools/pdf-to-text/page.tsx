import type { Metadata } from 'next';
import ToolPageSEO from '@/components/ToolPageSEO';
import { generateToolMetadata, getToolFaqs } from '@/lib/tool-seo';
import { generateToolPageSchema, generateFAQSchema } from '@/lib/schema';
import { getToolBySlug } from '@/lib/tools-data';
import PdfToTextTool from '@/components/tools/PdfToTextTool';

export async function generateMetadata(): Promise<Metadata> {
  return generateToolMetadata('pdf-to-text');
}

export default function PdfToTextPage() {
  const tool = getToolBySlug('pdf-to-text');
  const faqs = getToolFaqs('pdf-to-text');

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateToolPageSchema({ name: tool!.name, description: tool!.description, slug: 'pdf-to-text', category: tool!.category })) }} />
      {faqs.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateFAQSchema(faqs)) }} />}
      <PdfToTextTool />
      <ToolPageSEO slug="pdf-to-text" />
    </>
  );
}
