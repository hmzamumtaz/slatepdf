import type { Metadata } from 'next';
import ToolPageSEO from '@/components/ToolPageSEO';
import { generateToolMetadata, getToolFaqs } from '@/lib/tool-seo';
import { generateToolPageSchema, generateFAQSchema } from '@/lib/schema';
import { getToolBySlug } from '@/lib/tools-data';
import RemoveBlankPagesTool from '@/components/tools/RemoveBlankPagesTool';

export async function generateMetadata(): Promise<Metadata> {
  return generateToolMetadata('remove-blank-pages');
}

export default function RemoveBlankPagesToolPage() {
  const tool = getToolBySlug('remove-blank-pages');
  const faqs = getToolFaqs('remove-blank-pages');

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateToolPageSchema({ name: tool!.name, description: tool!.description, slug: 'remove-blank-pages', category: tool!.category })) }} />
      {faqs.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateFAQSchema(faqs)) }} />}
      <RemoveBlankPagesTool />
      <ToolPageSEO slug="remove-blank-pages" />
    </>
  );
}
