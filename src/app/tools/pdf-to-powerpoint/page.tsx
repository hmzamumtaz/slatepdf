import type { Metadata } from 'next';
import ToolPageSEO from '@/components/ToolPageSEO';
import { generateToolMetadata, getToolFaqs } from '@/lib/tool-seo';
import { generateSoftwareApplicationSchema, generateFAQSchema } from '@/lib/schema';
import { getToolBySlug } from '@/lib/tools-data';
import PdfToPowerPointTool from '@/components/tools/PdfToPowerPointTool';

export async function generateMetadata(): Promise<Metadata> {
  return generateToolMetadata('pdf-to-powerpoint');
}

export default function PdfToPowerPointPage() {
  const tool = getToolBySlug('pdf-to-powerpoint');
  const faqs = getToolFaqs('pdf-to-powerpoint');

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateSoftwareApplicationSchema({ name: tool!.name, description: tool!.description, slug: 'pdf-to-powerpoint', category: tool!.category })) }} />
      {faqs.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateFAQSchema(faqs)) }} />}
      <PdfToPowerPointTool />
      <ToolPageSEO slug="pdf-to-powerpoint" />
    </>
  );
}
