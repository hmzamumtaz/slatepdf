import type { Metadata } from 'next';
import ToolPageSEO from '@/components/ToolPageSEO';
import { generateToolMetadata, getToolFaqs } from '@/lib/tool-seo';
import { generateToolPageSchema, generateFAQSchema } from '@/lib/schema';
import { getToolBySlug } from '@/lib/tools-data';
import AddBlankPageTool from '@/components/tools/AddBlankPageTool';

export async function generateMetadata(): Promise<Metadata> {
  return generateToolMetadata('add-blank-page');
}

export default function AddBlankPageToolPage() {
  const tool = getToolBySlug('add-blank-page');
  const faqs = getToolFaqs('add-blank-page');

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateToolPageSchema({ name: tool!.name, description: tool!.description, slug: 'add-blank-page', category: tool!.category })) }} />
      {faqs.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateFAQSchema(faqs)) }} />}
      <AddBlankPageTool />
      <ToolPageSEO slug="add-blank-page" />
    </>
  );
}
