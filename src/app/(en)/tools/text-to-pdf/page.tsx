import type { Metadata } from 'next';
import ToolPageSEO from '@/components/ToolPageSEO';
import { generateToolMetadata, getToolFaqs } from '@/lib/tool-seo';
import { generateToolPageSchema, generateFAQSchema } from '@/lib/schema';
import { getToolBySlug } from '@/lib/tools-data';
import TextToPdfTool from '@/components/tools/TextToPdfTool';

export async function generateMetadata(): Promise<Metadata> {
  return generateToolMetadata('text-to-pdf');
}

export default function TextToPdfPage() {
  const tool = getToolBySlug('text-to-pdf');
  const faqs = getToolFaqs('text-to-pdf');

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateToolPageSchema({ name: tool!.name, description: tool!.description, slug: 'text-to-pdf', category: tool!.category })) }} />
      {faqs.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateFAQSchema(faqs)) }} />}
      <TextToPdfTool />
      <ToolPageSEO slug="text-to-pdf" />
    </>
  );
}
