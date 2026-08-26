import type { Metadata } from 'next';
import ToolPageSEO from '@/components/ToolPageSEO';
import { generateToolMetadata, getToolFaqs } from '@/lib/tool-seo';
import { generateSoftwareApplicationSchema, generateFAQSchema } from '@/lib/schema';
import { getToolBySlug } from '@/lib/tools-data';
import OrganizePdfTool from '@/components/tools/OrganizePdfTool';

export async function generateMetadata(): Promise<Metadata> {
  return generateToolMetadata('organize-pdf');
}

export default function OrganizePdfPage() {
  const tool = getToolBySlug('organize-pdf');
  const faqs = getToolFaqs('organize-pdf');

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateSoftwareApplicationSchema({ name: tool!.name, description: tool!.description, slug: 'organize-pdf', category: tool!.category })) }} />
      {faqs.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateFAQSchema(faqs)) }} />}
      <OrganizePdfTool />
      <ToolPageSEO slug="organize-pdf" />
    </>
  );
}
