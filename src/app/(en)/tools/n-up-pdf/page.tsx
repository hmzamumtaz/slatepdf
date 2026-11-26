import type { Metadata } from 'next';
import ToolPageSEO from '@/components/ToolPageSEO';
import { generateToolMetadata, getToolFaqs } from '@/lib/tool-seo';
import { generateToolPageSchema, generateFAQSchema } from '@/lib/schema';
import { getToolBySlug } from '@/lib/tools-data';
import NUpPdfTool from '@/components/tools/NUpPdfTool';

export async function generateMetadata(): Promise<Metadata> {
  return generateToolMetadata('n-up-pdf');
}

export default function NUpPdfToolPage() {
  const tool = getToolBySlug('n-up-pdf');
  const faqs = getToolFaqs('n-up-pdf');

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateToolPageSchema({ name: tool!.name, description: tool!.description, slug: 'n-up-pdf', category: tool!.category })) }} />
      {faqs.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateFAQSchema(faqs)) }} />}
      <NUpPdfTool />
      <ToolPageSEO slug="n-up-pdf" />
    </>
  );
}
