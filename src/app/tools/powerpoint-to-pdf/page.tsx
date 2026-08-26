import type { Metadata } from 'next';
import ToolPageSEO from '@/components/ToolPageSEO';
import { generateToolMetadata, getToolFaqs } from '@/lib/tool-seo';
import { generateSoftwareApplicationSchema, generateFAQSchema } from '@/lib/schema';
import { getToolBySlug } from '@/lib/tools-data';
import PowerPointToPdfTool from '@/components/tools/PowerPointToPdfTool';

export async function generateMetadata(): Promise<Metadata> {
  return generateToolMetadata('powerpoint-to-pdf');
}

export default function PowerPointToPdfPage() {
  const tool = getToolBySlug('powerpoint-to-pdf');
  const faqs = getToolFaqs('powerpoint-to-pdf');

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateSoftwareApplicationSchema({ name: tool!.name, description: tool!.description, slug: 'powerpoint-to-pdf', category: tool!.category })) }} />
      {faqs.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateFAQSchema(faqs)) }} />}
      <PowerPointToPdfTool />
      <ToolPageSEO slug="powerpoint-to-pdf" />
    </>
  );
}
