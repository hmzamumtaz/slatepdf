import type { Metadata } from 'next';
import ToolPageSEO from '@/components/ToolPageSEO';
import { generateToolMetadata, getToolFaqs } from '@/lib/tool-seo';
import { generateSoftwareApplicationSchema, generateFAQSchema } from '@/lib/schema';
import { getToolBySlug } from '@/lib/tools-data';
import SignPdfTool from '@/components/tools/SignPdfTool';

export async function generateMetadata(): Promise<Metadata> {
  return generateToolMetadata('sign-pdf');
}

export default function SignPdfPage() {
  const tool = getToolBySlug('sign-pdf');
  const faqs = getToolFaqs('sign-pdf');

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateSoftwareApplicationSchema({ name: tool!.name, description: tool!.description, slug: 'sign-pdf', category: tool!.category })) }} />
      {faqs.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateFAQSchema(faqs)) }} />}
      <SignPdfTool />
      <ToolPageSEO slug="sign-pdf" />
    </>
  );
}
