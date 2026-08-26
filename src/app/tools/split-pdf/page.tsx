import type { Metadata } from 'next';
import ToolPageSEO from '@/components/ToolPageSEO';
import { generateToolMetadata, getToolFaqs } from '@/lib/tool-seo';
import { generateSoftwareApplicationSchema, generateFAQSchema } from '@/lib/schema';
import { getToolBySlug } from '@/lib/tools-data';
import SplitPdfTool from '@/components/tools/SplitPdfTool';

export async function generateMetadata(): Promise<Metadata> {
  return generateToolMetadata('split-pdf');
}

export default function SplitPdfPage() {
  const tool = getToolBySlug('split-pdf');
  const faqs = getToolFaqs('split-pdf');

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateSoftwareApplicationSchema({ name: tool!.name, description: tool!.description, slug: 'split-pdf', category: tool!.category })) }} />
      {faqs.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateFAQSchema(faqs)) }} />}
      <SplitPdfTool />
      <ToolPageSEO slug="split-pdf" />
    </>
  );
}
