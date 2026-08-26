import type { Metadata } from 'next';
import JpgToPdfTool from '@/components/tools/JpgToPdfTool';
import ToolPageSEO from '@/components/ToolPageSEO';
import { generateToolMetadata, getToolFaqs } from '@/lib/tool-seo';
import { generateSoftwareApplicationSchema, generateFAQSchema } from '@/lib/schema';
import { getToolBySlug } from '@/lib/tools-data';

export async function generateMetadata(): Promise<Metadata> {
  return generateToolMetadata('jpg-to-pdf');
}

export default function JpgToPdfPage() {
  const tool = getToolBySlug('jpg-to-pdf');
  const faqs = getToolFaqs('jpg-to-pdf');

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateSoftwareApplicationSchema({ name: tool!.name, description: tool!.description, slug: 'jpg-to-pdf', category: tool!.category })) }} />
      {faqs.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateFAQSchema(faqs)) }} />}
      <JpgToPdfTool />
      <ToolPageSEO slug="jpg-to-pdf" />
    </>
  );
}
