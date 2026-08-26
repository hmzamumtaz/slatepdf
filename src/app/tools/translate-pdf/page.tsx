import type { Metadata } from 'next';
import ToolPageSEO from '@/components/ToolPageSEO';
import { generateToolMetadata, getToolFaqs } from '@/lib/tool-seo';
import { generateSoftwareApplicationSchema, generateFAQSchema } from '@/lib/schema';
import { getToolBySlug } from '@/lib/tools-data';
import TranslatePdfTool from '@/components/tools/TranslatePdfTool';

export async function generateMetadata(): Promise<Metadata> {
  return generateToolMetadata('translate-pdf');
}

export default function TranslatePdfPage() {
  const tool = getToolBySlug('translate-pdf');
  const faqs = getToolFaqs('translate-pdf');

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateSoftwareApplicationSchema({ name: tool!.name, description: tool!.description, slug: 'translate-pdf', category: tool!.category })) }} />
      {faqs.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateFAQSchema(faqs)) }} />}
      <TranslatePdfTool />
      <ToolPageSEO slug="translate-pdf" />
    </>
  );
}
