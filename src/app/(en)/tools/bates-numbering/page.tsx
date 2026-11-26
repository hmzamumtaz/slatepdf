import type { Metadata } from 'next';
import ToolPageSEO from '@/components/ToolPageSEO';
import { generateToolMetadata, getToolFaqs } from '@/lib/tool-seo';
import { generateToolPageSchema, generateFAQSchema } from '@/lib/schema';
import { getToolBySlug } from '@/lib/tools-data';
import BatesNumberingTool from '@/components/tools/BatesNumberingTool';

export async function generateMetadata(): Promise<Metadata> {
  return generateToolMetadata('bates-numbering');
}

export default function BatesNumberingPage() {
  const tool = getToolBySlug('bates-numbering');
  const faqs = getToolFaqs('bates-numbering');

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateToolPageSchema({ name: tool!.name, description: tool!.description, slug: 'bates-numbering', category: tool!.category })) }} />
      {faqs.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateFAQSchema(faqs)) }} />}
      <BatesNumberingTool />
      <ToolPageSEO slug="bates-numbering" />
    </>
  );
}
