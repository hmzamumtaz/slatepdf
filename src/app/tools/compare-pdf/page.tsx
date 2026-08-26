import type { Metadata } from 'next';
import ToolPageSEO from '@/components/ToolPageSEO';
import { generateToolMetadata, getToolFaqs } from '@/lib/tool-seo';
import { generateSoftwareApplicationSchema, generateFAQSchema } from '@/lib/schema';
import { getToolBySlug } from '@/lib/tools-data';
import ComparePdfTool from '@/components/tools/ComparePdfTool';

export async function generateMetadata(): Promise<Metadata> {
  return generateToolMetadata('compare-pdf');
}

export default function ComparePdfPage() {
  const tool = getToolBySlug('compare-pdf');
  const faqs = getToolFaqs('compare-pdf');

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateSoftwareApplicationSchema({ name: tool!.name, description: tool!.description, slug: 'compare-pdf', category: tool!.category })) }} />
      {faqs.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateFAQSchema(faqs)) }} />}
      <ComparePdfTool />
      <ToolPageSEO slug="compare-pdf" />
    </>
  );
}
