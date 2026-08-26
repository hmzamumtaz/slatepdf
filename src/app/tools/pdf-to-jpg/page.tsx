import type { Metadata } from 'next';
import ToolPageSEO from '@/components/ToolPageSEO';
import { generateToolMetadata, getToolFaqs } from '@/lib/tool-seo';
import { generateSoftwareApplicationSchema, generateFAQSchema } from '@/lib/schema';
import { getToolBySlug } from '@/lib/tools-data';
import PdfToJpgTool from '@/components/tools/PdfToJpgTool';

export async function generateMetadata(): Promise<Metadata> {
  return generateToolMetadata('pdf-to-jpg');
}

export default function PdfToJpgPage() {
  const tool = getToolBySlug('pdf-to-jpg');
  const faqs = getToolFaqs('pdf-to-jpg');

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateSoftwareApplicationSchema({ name: tool!.name, description: tool!.description, slug: 'pdf-to-jpg', category: tool!.category })) }} />
      {faqs.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateFAQSchema(faqs)) }} />}
      <PdfToJpgTool />
      <ToolPageSEO slug="pdf-to-jpg" />
    </>
  );
}
