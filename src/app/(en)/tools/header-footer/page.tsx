import type { Metadata } from 'next';
import ToolPageSEO from '@/components/ToolPageSEO';
import { generateToolMetadata, getToolFaqs } from '@/lib/tool-seo';
import { generateToolPageSchema, generateFAQSchema } from '@/lib/schema';
import { getToolBySlug } from '@/lib/tools-data';
import HeaderFooterTool from '@/components/tools/HeaderFooterTool';

export async function generateMetadata(): Promise<Metadata> {
  return generateToolMetadata('header-footer');
}

export default function HeaderFooterPage() {
  const tool = getToolBySlug('header-footer');
  const faqs = getToolFaqs('header-footer');

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateToolPageSchema({ name: tool!.name, description: tool!.description, slug: 'header-footer', category: tool!.category })) }} />
      {faqs.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateFAQSchema(faqs)) }} />}
      <HeaderFooterTool />
      <ToolPageSEO slug="header-footer" />
    </>
  );
}
