import type { Metadata } from 'next';
import ToolPageSEO from '@/components/ToolPageSEO';
import { generateToolMetadata, getToolFaqs } from '@/lib/tool-seo';
import { generateSoftwareApplicationSchema, generateFAQSchema } from '@/lib/schema';
import { getToolBySlug } from '@/lib/tools-data';
import CropPdfTool from '@/components/tools/CropPdfTool';

export async function generateMetadata(): Promise<Metadata> {
  return generateToolMetadata('crop-pdf');
}

export default function CropPdfPage() {
  const tool = getToolBySlug('crop-pdf');
  const faqs = getToolFaqs('crop-pdf');

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateSoftwareApplicationSchema({ name: tool!.name, description: tool!.description, slug: 'crop-pdf', category: tool!.category })) }} />
      {faqs.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateFAQSchema(faqs)) }} />}
      <CropPdfTool />
      <ToolPageSEO slug="crop-pdf" />
    </>
  );
}
