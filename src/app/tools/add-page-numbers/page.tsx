import type { Metadata } from 'next';
import ToolPageSEO from '@/components/ToolPageSEO';
import { generateToolMetadata, getToolFaqs } from '@/lib/tool-seo';
import { generateSoftwareApplicationSchema, generateFAQSchema } from '@/lib/schema';
import { getToolBySlug } from '@/lib/tools-data';
import AddPageNumbersTool from '@/components/tools/AddPageNumbersTool';

export async function generateMetadata(): Promise<Metadata> {
  return generateToolMetadata('add-page-numbers');
}

export default function AddPageNumbersPage() {
  const tool = getToolBySlug('add-page-numbers');
  const faqs = getToolFaqs('add-page-numbers');

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateSoftwareApplicationSchema({ name: tool!.name, description: tool!.description, slug: 'add-page-numbers', category: tool!.category })) }} />
      {faqs.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateFAQSchema(faqs)) }} />}
      <AddPageNumbersTool />
      <ToolPageSEO slug="add-page-numbers" />
    </>
  );
}
