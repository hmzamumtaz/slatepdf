import type { Metadata } from 'next';
import ToolPageSEO from '@/components/ToolPageSEO';
import { generateToolMetadata, getToolFaqs } from '@/lib/tool-seo';
import { generateSoftwareApplicationSchema, generateFAQSchema } from '@/lib/schema';
import { getToolBySlug } from '@/lib/tools-data';
import ExcelToPdfTool from '@/components/tools/ExcelToPdfTool';

export async function generateMetadata(): Promise<Metadata> {
  return generateToolMetadata('excel-to-pdf');
}

export default function ExcelToPdfPage() {
  const tool = getToolBySlug('excel-to-pdf');
  const faqs = getToolFaqs('excel-to-pdf');

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateSoftwareApplicationSchema({ name: tool!.name, description: tool!.description, slug: 'excel-to-pdf', category: tool!.category })) }} />
      {faqs.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateFAQSchema(faqs)) }} />}
      <ExcelToPdfTool />
      <ToolPageSEO slug="excel-to-pdf" />
    </>
  );
}
