import type { Metadata } from 'next';
import MergePdfTool from '@/components/tools/MergePdfTool';
import ToolPageSEO from '@/components/ToolPageSEO';
import { generateToolMetadata, getToolFaqs } from '@/lib/tool-seo';
import { generateSoftwareApplicationSchema, generateFAQSchema } from '@/lib/schema';
import { getToolBySlug } from '@/lib/tools-data';

export async function generateMetadata(): Promise<Metadata> {
  return generateToolMetadata('merge-pdf');
}

export default function MergePdfPage() {
  const tool = getToolBySlug('merge-pdf');
  const faqs = getToolFaqs('merge-pdf');

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateSoftwareApplicationSchema({ name: tool!.name, description: tool!.description, slug: 'merge-pdf', category: tool!.category })) }} />
      {faqs.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateFAQSchema(faqs)) }} />}
      <MergePdfTool />
      <ToolPageSEO slug="merge-pdf" />
    </>
  );
}
