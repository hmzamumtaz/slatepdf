import type { Metadata } from 'next';
import ToolPageSEO from '@/components/ToolPageSEO';
import { generateToolMetadata, getToolFaqs } from '@/lib/tool-seo';
import { generateToolPageSchema, generateFAQSchema } from '@/lib/schema';
import { getToolBySlug } from '@/lib/tools-data';
import FlattenPdfTool from '@/components/tools/FlattenPdfTool';

export async function generateMetadata(): Promise<Metadata> {
  return generateToolMetadata('flatten-pdf');
}

export default function FlattenPdfPage() {
  const tool = getToolBySlug('flatten-pdf');
  const faqs = getToolFaqs('flatten-pdf');

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateToolPageSchema({ name: tool!.name, description: tool!.description, slug: 'flatten-pdf', category: tool!.category })) }} />
      {faqs.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateFAQSchema(faqs)) }} />}
      <FlattenPdfTool />
      <ToolPageSEO slug="flatten-pdf" />
    </>
  );
}
