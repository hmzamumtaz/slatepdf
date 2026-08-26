import type { Metadata } from 'next';
import ToolPage from '@/components/ToolPage';
import ToolPageSEO from '@/components/ToolPageSEO';
import { generateToolMetadata, getToolFaqs } from '@/lib/tool-seo';
import { generateSoftwareApplicationSchema, generateFAQSchema } from '@/lib/schema';
import { getToolBySlug } from '@/lib/tools-data';
import { wordToPdf } from '@/lib/pdf-engine';
import { assertExpectedInput } from '@/lib/input-guard';

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
      <ToolPage
        slug="word-to-pdf"
        accept=".docx"
        processLabel="Convert to PDF"
        onProcess={async (files) => {
          assertExpectedInput(files[0], { extensions: ['.docx'], label: 'a Word document', counterpart: { extensions: ['.pdf'], toolName: 'PDF to Word', does: 'turn a PDF into an editable document' } });
          return wordToPdf(files[0]);
        }}
      />
      <ToolPageSEO slug="word-to-pdf" />
    </>
  );
}
