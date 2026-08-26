import type { Metadata } from 'next';
import ToolPageSEO from '@/components/ToolPageSEO';
import { generateToolMetadata, getToolFaqs } from '@/lib/tool-seo';
import { generateSoftwareApplicationSchema, generateFAQSchema } from '@/lib/schema';
import { getToolBySlug } from '@/lib/tools-data';
import RotatePdfTool from '@/components/tools/RotatePdfTool';

export async function generateMetadata(): Promise<Metadata> {
  return generateToolMetadata('rotate-pdf');
}

export default function RotatePdfPage() {
  const tool = getToolBySlug('rotate-pdf');
  const faqs = getToolFaqs('rotate-pdf');

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateSoftwareApplicationSchema({ name: tool!.name, description: tool!.description, slug: 'rotate-pdf', category: tool!.category })) }} />
      {faqs.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateFAQSchema(faqs)) }} />}
      <RotatePdfTool />
      <ToolPageSEO slug="rotate-pdf" />
    </>
  );
}
