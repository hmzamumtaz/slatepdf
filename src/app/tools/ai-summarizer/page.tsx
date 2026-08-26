import type { Metadata } from 'next';
import ToolPageSEO from '@/components/ToolPageSEO';
import { generateToolMetadata, getToolFaqs } from '@/lib/tool-seo';
import { generateSoftwareApplicationSchema, generateFAQSchema } from '@/lib/schema';
import { getToolBySlug } from '@/lib/tools-data';
import AiSummarizerTool from '@/components/tools/AiSummarizerTool';

export async function generateMetadata(): Promise<Metadata> {
  return generateToolMetadata('ai-summarizer');
}

export default function AiSummarizerPage() {
  const tool = getToolBySlug('ai-summarizer');
  const faqs = getToolFaqs('ai-summarizer');

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateSoftwareApplicationSchema({ name: tool!.name, description: tool!.description, slug: 'ai-summarizer', category: tool!.category })) }} />
      {faqs.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateFAQSchema(faqs)) }} />}
      <AiSummarizerTool />
      <ToolPageSEO slug="ai-summarizer" />
    </>
  );
}
