import type { Metadata } from 'next';
import ToolPage from '@/components/ToolPage';
import ToolPageSEO from '@/components/ToolPageSEO';
import { generateToolMetadata, getToolFaqs } from '@/lib/tool-seo';
import { generateSoftwareApplicationSchema, generateFAQSchema } from '@/lib/schema';
import { getToolBySlug } from '@/lib/tools-data';
import { pdfToWord } from '@/lib/pdf-engine';
import { assertExpectedInput } from '@/lib/input-guard';

export async function generateMetadata(): Promise<Metadata> {
  return generateToolMetadata('pdf-to-word');
}

export default function PdfToWordPage() {
  const tool = getToolBySlug('pdf-to-word');
  const faqs = getToolFaqs('pdf-to-word');

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateSoftwareApplicationSchema({ name: tool!.name, description: tool!.description, slug: 'pdf-to-word', category: tool!.category })) }} />
      {faqs.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateFAQSchema(faqs)) }} />}
      <ToolPage
        slug="pdf-to-word"
        accept=".pdf"
        processLabel="Convert to Word"
        onProcess={async (files) => {
          assertExpectedInput(files[0], { extensions: ['.pdf'], label: 'a PDF', counterpart: { extensions: ['.docx', '.doc'], toolName: 'Word to PDF', does: 'turn a document into a PDF' } });
          return pdfToWord(files[0]);
        }}
      />
      <ToolPageSEO slug="pdf-to-word" />
    </>
  );
}
