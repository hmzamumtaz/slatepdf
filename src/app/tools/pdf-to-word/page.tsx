import type { Metadata } from 'next';
import PdfToWordTool from '@/components/tools/PdfToWordTool';
import ToolPageSEO from '@/components/ToolPageSEO';
import { generateToolMetadata, getToolFaqs } from '@/lib/tool-seo';
import { generateSoftwareApplicationSchema, generateFAQSchema } from '@/lib/schema';
import { getToolBySlug } from '@/lib/tools-data';

export async function generateMetadata(): Promise<Metadata> {
  return generateToolMetadata('pdf-to-word');
}

export default function PdfToWordPage() {
  const tool = getToolBySlug('pdf-to-word');
  const faqs = getToolFaqs('pdf-to-word');

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateSoftwareApplicationSchema({ name: tool!.name, description: tool!.description, slug: 'pdf-to-word', category: tool!.category })) }} />
      {faqs.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateFAQSchema(faqs)) }} />}
      <PdfToWordTool />
      <ToolPageSEO slug="pdf-to-word" />
    </>
  );
}
