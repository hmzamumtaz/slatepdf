import type { Metadata } from 'next';
import ToolPageSEO from '@/components/ToolPageSEO';
import { generateToolMetadata, getToolFaqs } from '@/lib/tool-seo';
import { generateSoftwareApplicationSchema, generateFAQSchema } from '@/lib/schema';
import { getToolBySlug } from '@/lib/tools-data';
import EditPdfTool from '@/components/tools/EditPdfTool';

export async function generateMetadata(): Promise<Metadata> {
  return generateToolMetadata('edit-pdf');
}

export default function EditPdfPage() {
  const tool = getToolBySlug('edit-pdf');
  const faqs = getToolFaqs('edit-pdf');

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateSoftwareApplicationSchema({ name: tool!.name, description: tool!.description, slug: 'edit-pdf', category: tool!.category })) }} />
      {faqs.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateFAQSchema(faqs)) }} />}
      <EditPdfTool />
      <ToolPageSEO slug="edit-pdf" />
    </>
  );
}
