import type { Metadata } from 'next';
import ToolPage from '@/components/ToolPage';
import ToolPageSEO from '@/components/ToolPageSEO';
import { generateToolMetadata, getToolFaqs } from '@/lib/tool-seo';
import { generateSoftwareApplicationSchema, generateFAQSchema } from '@/lib/schema';
import { getToolBySlug } from '@/lib/tools-data';
import { mergePdfs } from '@/lib/pdf-engine';

export async function generateMetadata(): Promise<Metadata> {
  return generateToolMetadata('merge-pdf');
}

export default function MergePdfPage() {
  const tool = getToolBySlug('merge-pdf');
  const faqs = getToolFaqs('merge-pdf');

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateSoftwareApplicationSchema({ name: tool!.name, description: tool!.description, slug: 'merge-pdf', category: tool!.category })) }} />
      {faqs.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateFAQSchema(faqs)) }} />}
      <ToolPage
        slug="merge-pdf"
        accept=".pdf"
        processLabel="Merge PDFs"
        processAllTogether
        minFiles={2}
        minFilesMessage="Upload at least 2 PDF files to merge them together."
        onProcess={async (files) => mergePdfs(files)}
      />
      <ToolPageSEO slug="merge-pdf" />
    </>
  );
}
