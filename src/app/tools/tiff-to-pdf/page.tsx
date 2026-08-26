import type { Metadata } from 'next';
import ToolPageSEO from '@/components/ToolPageSEO';
import { generateToolMetadata, getToolFaqs } from '@/lib/tool-seo';
import { generateSoftwareApplicationSchema, generateFAQSchema } from '@/lib/schema';
import { getToolBySlug } from '@/lib/tools-data';
import TiffToPdfTool from '@/components/tools/TiffToPdfTool';

export async function generateMetadata(): Promise<Metadata> {
  return generateToolMetadata('tiff-to-pdf');
}

export default function TiffToPdfPage() {
  const tool = getToolBySlug('tiff-to-pdf');
  const faqs = getToolFaqs('tiff-to-pdf');

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateSoftwareApplicationSchema({ name: tool!.name, description: tool!.description, slug: 'tiff-to-pdf', category: tool!.category })) }} />
      {faqs.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateFAQSchema(faqs)) }} />}
      <TiffToPdfTool />
      <ToolPageSEO slug="tiff-to-pdf" />
    </>
  );
}
