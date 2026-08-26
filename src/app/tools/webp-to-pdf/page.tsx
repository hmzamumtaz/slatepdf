import type { Metadata } from 'next';
import ToolPageSEO from '@/components/ToolPageSEO';
import { generateToolMetadata, getToolFaqs } from '@/lib/tool-seo';
import { generateSoftwareApplicationSchema, generateFAQSchema } from '@/lib/schema';
import { getToolBySlug } from '@/lib/tools-data';
import WebpToPdfTool from '@/components/tools/WebpToPdfTool';

export async function generateMetadata(): Promise<Metadata> {
  return generateToolMetadata('webp-to-pdf');
}

export default function WebpToPdfPage() {
  const tool = getToolBySlug('webp-to-pdf');
  const faqs = getToolFaqs('webp-to-pdf');

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateSoftwareApplicationSchema({ name: tool!.name, description: tool!.description, slug: 'webp-to-pdf', category: tool!.category })) }} />
      {faqs.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateFAQSchema(faqs)) }} />}
      <WebpToPdfTool />
      <ToolPageSEO slug="webp-to-pdf" />
    </>
  );
}
