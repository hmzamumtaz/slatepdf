import type { Metadata } from 'next';
import WordToPdfTool from '@/components/tools/WordToPdfTool';
import ToolPageSEO from '@/components/ToolPageSEO';
import { generateToolMetadata, getToolFaqs } from '@/lib/tool-seo';
import { generateSoftwareApplicationSchema, generateFAQSchema } from '@/lib/schema';
import { getToolBySlug } from '@/lib/tools-data';

export async function generateMetadata(): Promise<Metadata> {
  return generateToolMetadata('word-to-pdf');
}

export default function WordToPdfPage() {
  const tool = getToolBySlug('word-to-pdf');
  const faqs = getToolFaqs('word-to-pdf');

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateSoftwareApplicationSchema({ name: tool!.name, description: tool!.description, slug: 'word-to-pdf', category: tool!.category })) }} />
      {faqs.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateFAQSchema(faqs)) }} />}
      <WordToPdfTool />
      <ToolPageSEO slug="word-to-pdf" />
    </>
  );
}
