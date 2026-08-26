import type { Metadata } from 'next';
import ToolPageSEO from '@/components/ToolPageSEO';
import { generateToolMetadata, getToolFaqs } from '@/lib/tool-seo';
import { generateSoftwareApplicationSchema, generateFAQSchema } from '@/lib/schema';
import { getToolBySlug } from '@/lib/tools-data';
import SvgToPdfTool from '@/components/tools/SvgToPdfTool';

export async function generateMetadata(): Promise<Metadata> {
  return generateToolMetadata('svg-to-pdf');
}

export default function SvgToPdfPage() {
  const tool = getToolBySlug('svg-to-pdf');
  const faqs = getToolFaqs('svg-to-pdf');

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateSoftwareApplicationSchema({ name: tool!.name, description: tool!.description, slug: 'svg-to-pdf', category: tool!.category })) }} />
      {faqs.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateFAQSchema(faqs)) }} />}
      <SvgToPdfTool />
      <ToolPageSEO slug="svg-to-pdf" />
    </>
  );
}
