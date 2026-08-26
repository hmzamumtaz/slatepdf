import type { Metadata } from 'next';
import ToolPageSEO from '@/components/ToolPageSEO';
import { generateToolMetadata, getToolFaqs } from '@/lib/tool-seo';
import { generateSoftwareApplicationSchema, generateFAQSchema } from '@/lib/schema';
import { getToolBySlug } from '@/lib/tools-data';
import HeicToPdfTool from '@/components/tools/HeicToPdfTool';

export async function generateMetadata(): Promise<Metadata> {
  return generateToolMetadata('heic-to-pdf');
}

export default function HeicToPdfPage() {
  const tool = getToolBySlug('heic-to-pdf');
  const faqs = getToolFaqs('heic-to-pdf');

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateSoftwareApplicationSchema({ name: tool!.name, description: tool!.description, slug: 'heic-to-pdf', category: tool!.category })) }} />
      {faqs.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateFAQSchema(faqs)) }} />}
      <HeicToPdfTool />
      <ToolPageSEO slug="heic-to-pdf" />
    </>
  );
}
