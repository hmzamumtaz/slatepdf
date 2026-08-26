import type { Metadata } from 'next';
import PdfToPdfATool from '@/components/tools/PdfToPdfATool';
import ToolPageSEO from '@/components/ToolPageSEO';
import { generateToolMetadata, getToolFaqs } from '@/lib/tool-seo';
import { generateSoftwareApplicationSchema, generateFAQSchema } from '@/lib/schema';
import { getToolBySlug } from '@/lib/tools-data';

export async function generateMetadata(): Promise<Metadata> {
  return generateToolMetadata('pdf-to-pdfa');
}

export default function PdfToPdfAPage() {
  const tool = getToolBySlug('pdf-to-pdfa');
  const faqs = getToolFaqs('pdf-to-pdfa');

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateSoftwareApplicationSchema({ name: tool!.name, description: tool!.description, slug: 'pdf-to-pdfa', category: tool!.category })) }} />
      {faqs.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateFAQSchema(faqs)) }} />}
      <PdfToPdfATool />
      <ToolPageSEO slug="pdf-to-pdfa" />
    </>
  );
}
