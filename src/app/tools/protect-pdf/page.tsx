import type { Metadata } from 'next';
import ToolPageSEO from '@/components/ToolPageSEO';
import { generateToolMetadata, getToolFaqs } from '@/lib/tool-seo';
import { generateSoftwareApplicationSchema, generateFAQSchema } from '@/lib/schema';
import { getToolBySlug } from '@/lib/tools-data';
import ProtectPdfTool from '@/components/tools/ProtectPdfTool';

export async function generateMetadata(): Promise<Metadata> {
  return generateToolMetadata('protect-pdf');
}

export default function ProtectPdfPage() {
  const tool = getToolBySlug('protect-pdf');
  const faqs = getToolFaqs('protect-pdf');

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateSoftwareApplicationSchema({ name: tool!.name, description: tool!.description, slug: 'protect-pdf', category: tool!.category })) }} />
      {faqs.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateFAQSchema(faqs)) }} />}
      <ProtectPdfTool />
      <ToolPageSEO slug="protect-pdf" />
    </>
  );
}
