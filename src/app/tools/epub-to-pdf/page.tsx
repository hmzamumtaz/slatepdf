import type { Metadata } from 'next';
import ToolPageSEO from '@/components/ToolPageSEO';
import { generateToolMetadata, getToolFaqs } from '@/lib/tool-seo';
import { generateSoftwareApplicationSchema, generateFAQSchema } from '@/lib/schema';
import { getToolBySlug } from '@/lib/tools-data';
import EpubToPdfTool from '@/components/tools/EpubToPdfTool';

export async function generateMetadata(): Promise<Metadata> {
  return generateToolMetadata('epub-to-pdf');
}

export default function EpubToPdfPage() {
  const tool = getToolBySlug('epub-to-pdf');
  const faqs = getToolFaqs('epub-to-pdf');

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateSoftwareApplicationSchema({ name: tool!.name, description: tool!.description, slug: 'epub-to-pdf', category: tool!.category })) }} />
      {faqs.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateFAQSchema(faqs)) }} />}
      <EpubToPdfTool />
      <ToolPageSEO slug="epub-to-pdf" />
    </>
  );
}
