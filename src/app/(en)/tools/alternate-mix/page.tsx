import type { Metadata } from 'next';
import ToolPageSEO from '@/components/ToolPageSEO';
import { generateToolMetadata, getToolFaqs } from '@/lib/tool-seo';
import { generateToolPageSchema, generateFAQSchema } from '@/lib/schema';
import { getToolBySlug } from '@/lib/tools-data';
import AlternateMixTool from '@/components/tools/AlternateMixTool';

export async function generateMetadata(): Promise<Metadata> {
  return generateToolMetadata('alternate-mix');
}

export default function AlternateMixPage() {
  const tool = getToolBySlug('alternate-mix');
  const faqs = getToolFaqs('alternate-mix');

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateToolPageSchema({ name: tool!.name, description: tool!.description, slug: 'alternate-mix', category: tool!.category })) }} />
      {faqs.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateFAQSchema(faqs)) }} />}
      <AlternateMixTool />
      <ToolPageSEO slug="alternate-mix" />
    </>
  );
}
