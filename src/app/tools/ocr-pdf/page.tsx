import type { Metadata } from 'next';
import ToolPageSEO from '@/components/ToolPageSEO';
import { generateToolMetadata, getToolFaqs } from '@/lib/tool-seo';
import { generateSoftwareApplicationSchema, generateFAQSchema } from '@/lib/schema';
import { getToolBySlug } from '@/lib/tools-data';
import OcrPdfTool from '@/components/tools/OcrPdfTool';

export async function generateMetadata(): Promise<Metadata> {
  return generateToolMetadata('ocr-pdf');
}

export default function OcrPdfPage() {
  const tool = getToolBySlug('ocr-pdf');
  const faqs = getToolFaqs('ocr-pdf');

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateSoftwareApplicationSchema({ name: tool!.name, description: tool!.description, slug: 'ocr-pdf', category: tool!.category })) }} />
      {faqs.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateFAQSchema(faqs)) }} />}
      <OcrPdfTool />
      <ToolPageSEO slug="ocr-pdf" />
    </>
  );
}
