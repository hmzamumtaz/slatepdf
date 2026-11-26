import type { Metadata } from 'next';
import ToolPageSEO from '@/components/ToolPageSEO';
import { generateToolMetadata, getToolFaqs } from '@/lib/tool-seo';
import { generateToolPageSchema, generateFAQSchema } from '@/lib/schema';
import { getToolBySlug } from '@/lib/tools-data';
import DeskewPdfTool from '@/components/tools/DeskewPdfTool';

export async function generateMetadata(): Promise<Metadata> {
  return generateToolMetadata('deskew-pdf');
}

export default function DeskewPdfToolPage() {
  const tool = getToolBySlug('deskew-pdf');
  const faqs = getToolFaqs('deskew-pdf');

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateToolPageSchema({ name: tool!.name, description: tool!.description, slug: 'deskew-pdf', category: tool!.category })) }} />
      {faqs.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateFAQSchema(faqs)) }} />}
      <DeskewPdfTool />
      <ToolPageSEO slug="deskew-pdf" />
    </>
  );
}
