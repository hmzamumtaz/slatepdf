import type { Metadata } from 'next';
import ToolPageSEO from '@/components/ToolPageSEO';
import { generateToolMetadata, getToolFaqs } from '@/lib/tool-seo';
import { generateSoftwareApplicationSchema, generateFAQSchema } from '@/lib/schema';
import { getToolBySlug } from '@/lib/tools-data';
import HtmlToPdfTool from '@/components/tools/HtmlToPdfTool';

export async function generateMetadata(): Promise<Metadata> {
  return generateToolMetadata('html-to-pdf');
}

export default function HtmlToPdfPage() {
  const tool = getToolBySlug('html-to-pdf');
  const faqs = getToolFaqs('html-to-pdf');

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateSoftwareApplicationSchema({ name: tool!.name, description: tool!.description, slug: 'html-to-pdf', category: tool!.category })) }} />
      {faqs.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateFAQSchema(faqs)) }} />}
      <HtmlToPdfTool />
      <ToolPageSEO slug="html-to-pdf" />
    </>
  );
}
