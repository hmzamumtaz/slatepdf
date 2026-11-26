import type { Metadata } from 'next';
import ToolPageSEO from '@/components/ToolPageSEO';
import { generateToolMetadata, getToolFaqs } from '@/lib/tool-seo';
import { generateToolPageSchema, generateFAQSchema } from '@/lib/schema';
import { getToolBySlug } from '@/lib/tools-data';
import ExtractImagesTool from '@/components/tools/ExtractImagesTool';

export async function generateMetadata(): Promise<Metadata> {
  return generateToolMetadata('extract-images');
}

export default function ExtractImagesPage() {
  const tool = getToolBySlug('extract-images');
  const faqs = getToolFaqs('extract-images');

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateToolPageSchema({ name: tool!.name, description: tool!.description, slug: 'extract-images', category: tool!.category })) }} />
      {faqs.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateFAQSchema(faqs)) }} />}
      <ExtractImagesTool />
      <ToolPageSEO slug="extract-images" />
    </>
  );
}
