import type { Metadata } from 'next';
import ToolPageSEO from '@/components/ToolPageSEO';
import { generateToolMetadata, getToolFaqs } from '@/lib/tool-seo';
import { generateSoftwareApplicationSchema, generateFAQSchema } from '@/lib/schema';
import { getToolBySlug } from '@/lib/tools-data';
import RedactPdfTool from '@/components/tools/RedactPdfTool';

export async function generateMetadata(): Promise<Metadata> {
  return generateToolMetadata('redact-pdf');
}

export default function RedactPdfPage() {
  const tool = getToolBySlug('redact-pdf');
  const faqs = getToolFaqs('redact-pdf');

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateSoftwareApplicationSchema({ name: tool!.name, description: tool!.description, slug: 'redact-pdf', category: tool!.category })) }} />
      {faqs.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateFAQSchema(faqs)) }} />}
      <RedactPdfTool />
      <ToolPageSEO slug="redact-pdf" />
    </>
  );
}
