import type { Metadata } from 'next';
import ScanPdfTool from '@/components/tools/ScanPdfTool';
import ToolPageSEO from '@/components/ToolPageSEO';
import { generateToolMetadata, getToolFaqs } from '@/lib/tool-seo';
import { generateSoftwareApplicationSchema, generateFAQSchema } from '@/lib/schema';
import { getToolBySlug } from '@/lib/tools-data';

export async function generateMetadata(): Promise<Metadata> {
  return generateToolMetadata('scan-pdf');
}

export default function ScanPdfPage() {
  const tool = getToolBySlug('scan-pdf');
  const faqs = getToolFaqs('scan-pdf');

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateSoftwareApplicationSchema({ name: tool!.name, description: tool!.description, slug: 'scan-pdf', category: tool!.category })) }} />
      {faqs.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateFAQSchema(faqs)) }} />}
      <ScanPdfTool />
      <ToolPageSEO slug="scan-pdf" />
    </>
  );
}