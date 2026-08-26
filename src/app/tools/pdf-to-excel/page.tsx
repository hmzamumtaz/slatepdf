import type { Metadata } from 'next';
import PdfToExcelTool from '@/components/tools/PdfToExcelTool';
import ToolPageSEO from '@/components/ToolPageSEO';
import { generateToolMetadata, getToolFaqs } from '@/lib/tool-seo';
import { generateSoftwareApplicationSchema, generateFAQSchema } from '@/lib/schema';
import { getToolBySlug } from '@/lib/tools-data';

export async function generateMetadata(): Promise<Metadata> {
  return generateToolMetadata('pdf-to-excel');
}

export default function PdfToExcelPage() {
  const tool = getToolBySlug('pdf-to-excel');
  const faqs = getToolFaqs('pdf-to-excel');

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateSoftwareApplicationSchema({ name: tool!.name, description: tool!.description, slug: 'pdf-to-excel', category: tool!.category })) }} />
      {faqs.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateFAQSchema(faqs)) }} />}
      <PdfToExcelTool />
      <ToolPageSEO slug="pdf-to-excel" />
    </>
  );
}
