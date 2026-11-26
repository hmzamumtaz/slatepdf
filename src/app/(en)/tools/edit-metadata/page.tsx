import type { Metadata } from 'next';
import ToolPageSEO from '@/components/ToolPageSEO';
import { generateToolMetadata, getToolFaqs } from '@/lib/tool-seo';
import { generateToolPageSchema, generateFAQSchema } from '@/lib/schema';
import { getToolBySlug } from '@/lib/tools-data';
import EditMetadataTool from '@/components/tools/EditMetadataTool';

export async function generateMetadata(): Promise<Metadata> {
  return generateToolMetadata('edit-metadata');
}

export default function EditMetadataPage() {
  const tool = getToolBySlug('edit-metadata');
  const faqs = getToolFaqs('edit-metadata');

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateToolPageSchema({ name: tool!.name, description: tool!.description, slug: 'edit-metadata', category: tool!.category })) }} />
      {faqs.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateFAQSchema(faqs)) }} />}
      <EditMetadataTool />
      <ToolPageSEO slug="edit-metadata" />
    </>
  );
}
