import type { Metadata } from 'next';
import PdfWorkspaceTool from '@/components/tools/PdfWorkspaceTool';
import ToolPageSEO from '@/components/ToolPageSEO';
import { generateToolMetadata, getToolFaqs } from '@/lib/tool-seo';
import { generateToolPageSchema, generateFAQSchema } from '@/lib/schema';
import { getToolBySlug } from '@/lib/tools-data';

export async function generateMetadata(): Promise<Metadata> {
  return generateToolMetadata('pdf-workspace');
}

export default function PdfWorkspacePage() {
  const tool = getToolBySlug('pdf-workspace');
  const faqs = getToolFaqs('pdf-workspace');

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateToolPageSchema({ name: tool!.name, description: tool!.description, slug: 'pdf-workspace', category: tool!.category })) }} />
      {faqs.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateFAQSchema(faqs)) }} />}
      <PdfWorkspaceTool />
      <ToolPageSEO slug="pdf-workspace" />
    </>
  );
}
