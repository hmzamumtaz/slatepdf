import type { Metadata } from 'next';
import ToolPageSEO from '@/components/ToolPageSEO';
import { generateToolMetadata, getToolFaqs } from '@/lib/tool-seo';
import { generateToolPageSchema, generateFAQSchema } from '@/lib/schema';
import { getToolBySlug } from '@/lib/tools-data';
import GrayscalePdfTool from '@/components/tools/GrayscalePdfTool';

export async function generateMetadata(): Promise<Metadata> {
  return generateToolMetadata('grayscale-pdf');
}

export default function GrayscalePdfToolPage() {
  const tool = getToolBySlug('grayscale-pdf');
  const faqs = getToolFaqs('grayscale-pdf');

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateToolPageSchema({ name: tool!.name, description: tool!.description, slug: 'grayscale-pdf', category: tool!.category })) }} />
      {faqs.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateFAQSchema(faqs)) }} />}
      <GrayscalePdfTool />
      <ToolPageSEO slug="grayscale-pdf" />
    </>
  );
}
