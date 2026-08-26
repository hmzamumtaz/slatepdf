import type { Metadata } from 'next';
import ToolPageSEO from '@/components/ToolPageSEO';
import { generateToolMetadata, getToolFaqs } from '@/lib/tool-seo';
import { generateSoftwareApplicationSchema, generateFAQSchema } from '@/lib/schema';
import { getToolBySlug } from '@/lib/tools-data';
import ExtractPagesTool from '@/components/tools/ExtractPagesTool';

export async function generateMetadata(): Promise<Metadata> {
  return generateToolMetadata('extract-pages');
}

export default function ExtractPagesPage() {
  const tool = getToolBySlug('extract-pages');
  const faqs = getToolFaqs('extract-pages');

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateSoftwareApplicationSchema({ name: tool!.name, description: tool!.description, slug: 'extract-pages', category: tool!.category })) }} />
      {faqs.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateFAQSchema(faqs)) }} />}
      <ExtractPagesTool />
      <ToolPageSEO slug="extract-pages" />
    </>
  );
}
