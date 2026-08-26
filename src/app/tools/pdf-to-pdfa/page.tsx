import type { Metadata } from 'next';
import ToolPage from '@/components/ToolPage';
import ToolPageSEO from '@/components/ToolPageSEO';
import { generateToolMetadata, getToolFaqs } from '@/lib/tool-seo';
import { generateSoftwareApplicationSchema, generateFAQSchema } from '@/lib/schema';
import { getToolBySlug } from '@/lib/tools-data';
import { convertToPdfA } from '@/lib/pdf-engine';

export async function generateMetadata(): Promise<Metadata> {
  return generateToolMetadata('pdf-to-pdfa');
}

export default function PdfToPdfAPage() {
  const tool = getToolBySlug('pdf-to-pdfa');
  const faqs = getToolFaqs('pdf-to-pdfa');

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateSoftwareApplicationSchema({ name: tool!.name, description: tool!.description, slug: 'pdf-to-pdfa', category: tool!.category })) }} />
      {faqs.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateFAQSchema(faqs)) }} />}
      <ToolPage
        slug="pdf-to-pdfa"
        accept=".pdf"
        processLabel="Convert to PDF/A"
        onProcess={async (files) => convertToPdfA(files[0])}
      />
      <ToolPageSEO slug="pdf-to-pdfa" />
    </>
  );
}
