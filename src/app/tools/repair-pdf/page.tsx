import type { Metadata } from 'next';
import ToolPageSEO from '@/components/ToolPageSEO';
import { generateToolMetadata, getToolFaqs } from '@/lib/tool-seo';
import { generateSoftwareApplicationSchema, generateFAQSchema } from '@/lib/schema';
import { getToolBySlug } from '@/lib/tools-data';
import RepairPdfTool from '@/components/tools/RepairPdfTool';

export async function generateMetadata(): Promise<Metadata> {
  return generateToolMetadata('repair-pdf');
}

export default function RepairPdfPage() {
  const tool = getToolBySlug('repair-pdf');
  const faqs = getToolFaqs('repair-pdf');

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateSoftwareApplicationSchema({ name: tool!.name, description: tool!.description, slug: 'repair-pdf', category: tool!.category })) }} />
      {faqs.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateFAQSchema(faqs)) }} />}
      <RepairPdfTool />
      <ToolPageSEO slug="repair-pdf" />
    </>
  );
}
