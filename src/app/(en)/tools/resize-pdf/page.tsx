import type { Metadata } from 'next';
import ToolPageSEO from '@/components/ToolPageSEO';
import { generateToolMetadata, getToolFaqs } from '@/lib/tool-seo';
import { generateToolPageSchema, generateFAQSchema } from '@/lib/schema';
import { getToolBySlug } from '@/lib/tools-data';
import ResizePdfTool from '@/components/tools/ResizePdfTool';

export async function generateMetadata(): Promise<Metadata> {
  return generateToolMetadata('resize-pdf');
}

export default function ResizePdfToolPage() {
  const tool = getToolBySlug('resize-pdf');
  const faqs = getToolFaqs('resize-pdf');

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateToolPageSchema({ name: tool!.name, description: tool!.description, slug: 'resize-pdf', category: tool!.category })) }} />
      {faqs.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateFAQSchema(faqs)) }} />}
      <ResizePdfTool />
      <ToolPageSEO slug="resize-pdf" />
    </>
  );
}
