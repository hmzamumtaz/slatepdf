import type { Metadata } from 'next';
import ToolPageSEO from '@/components/ToolPageSEO';
import { generateToolMetadata, getToolFaqs } from '@/lib/tool-seo';
import { generateSoftwareApplicationSchema, generateFAQSchema } from '@/lib/schema';
import { getToolBySlug } from '@/lib/tools-data';
import CompressPdfTool from '@/components/tools/CompressPdfTool';

export async function generateMetadata(): Promise<Metadata> {
  return generateToolMetadata('compress-pdf');
}

export default function CompressPdfPage() {
  const tool = getToolBySlug('compress-pdf');
  const faqs = getToolFaqs('compress-pdf');

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateSoftwareApplicationSchema({ name: tool!.name, description: tool!.description, slug: 'compress-pdf', category: tool!.category })) }} />
      {faqs.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateFAQSchema(faqs)) }} />}
      <CompressPdfTool />
      <ToolPageSEO slug="compress-pdf" />
    </>
  );
}
