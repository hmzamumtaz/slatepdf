import type { Metadata } from 'next';
import ToolPageSEO from '@/components/ToolPageSEO';
import { generateToolMetadata, getToolFaqs } from '@/lib/tool-seo';
import { generateToolPageSchema, generateFAQSchema } from '@/lib/schema';
import { getToolBySlug } from '@/lib/tools-data';
import PdfToHtmlTool from '@/components/tools/PdfToHtmlTool';

export async function generateMetadata(): Promise<Metadata> {
  return generateToolMetadata('pdf-to-html');
}

export default function PdfToHtmlPage() {
  const tool = getToolBySlug('pdf-to-html');
  const faqs = getToolFaqs('pdf-to-html');

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateToolPageSchema({ name: tool!.name, description: tool!.description, slug: 'pdf-to-html', category: tool!.category })) }} />
      {faqs.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateFAQSchema(faqs)) }} />}
      <PdfToHtmlTool />
      <ToolPageSEO slug="pdf-to-html" />
    </>
  );
}
