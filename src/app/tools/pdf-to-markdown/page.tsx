import type { Metadata } from 'next';
import ToolPageSEO from '@/components/ToolPageSEO';
import { generateToolMetadata, getToolFaqs } from '@/lib/tool-seo';
import { generateSoftwareApplicationSchema, generateFAQSchema } from '@/lib/schema';
import { getToolBySlug } from '@/lib/tools-data';
import PdfToMarkdownTool from '@/components/tools/PdfToMarkdownTool';

export async function generateMetadata(): Promise<Metadata> {
  return generateToolMetadata('pdf-to-markdown');
}

export default function PdfToMarkdownPage() {
  const tool = getToolBySlug('pdf-to-markdown');
  const faqs = getToolFaqs('pdf-to-markdown');

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateSoftwareApplicationSchema({ name: tool!.name, description: tool!.description, slug: 'pdf-to-markdown', category: tool!.category })) }} />
      {faqs.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateFAQSchema(faqs)) }} />}
      <PdfToMarkdownTool />
      <ToolPageSEO slug="pdf-to-markdown" />
    </>
  );
}
