import type { Metadata } from 'next';
import ToolPageSEO from '@/components/ToolPageSEO';
import { generateToolMetadata, getToolFaqs } from '@/lib/tool-seo';
import { generateSoftwareApplicationSchema, generateFAQSchema } from '@/lib/schema';
import { getToolBySlug } from '@/lib/tools-data';
import UnlockPdfTool from '@/components/tools/UnlockPdfTool';

export async function generateMetadata(): Promise<Metadata> {
  return generateToolMetadata('unlock-pdf');
}

export default function UnlockPdfPage() {
  const tool = getToolBySlug('unlock-pdf');
  const faqs = getToolFaqs('unlock-pdf');

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateSoftwareApplicationSchema({ name: tool!.name, description: tool!.description, slug: 'unlock-pdf', category: tool!.category })) }} />
      {faqs.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateFAQSchema(faqs)) }} />}
      <UnlockPdfTool />
      <ToolPageSEO slug="unlock-pdf" />
    </>
  );
}
