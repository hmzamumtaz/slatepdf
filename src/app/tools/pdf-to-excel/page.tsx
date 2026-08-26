import type { Metadata } from 'next';
import ToolPage from '@/components/ToolPage';
import ToolPageSEO from '@/components/ToolPageSEO';
import { generateToolMetadata, getToolFaqs } from '@/lib/tool-seo';
import { generateSoftwareApplicationSchema, generateFAQSchema } from '@/lib/schema';
import { getToolBySlug } from '@/lib/tools-data';
import { pdfToExcel } from '@/lib/pdf-engine';
import { assertExpectedInput } from '@/lib/input-guard';

export async function generateMetadata(): Promise<Metadata> {
  return generateToolMetadata('pdf-to-excel');
}

export default function PdfToExcelPage() {
  const tool = getToolBySlug('pdf-to-excel');
  const faqs = getToolFaqs('pdf-to-excel');

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateSoftwareApplicationSchema({ name: tool!.name, description: tool!.description, slug: 'pdf-to-excel', category: tool!.category })) }} />
      {faqs.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateFAQSchema(faqs)) }} />}
      <ToolPage
        slug="pdf-to-excel"
        accept=".pdf"
        processLabel="Convert to Excel"
        onProcess={async (files) => {
          assertExpectedInput(files[0], { extensions: ['.pdf'], label: 'a PDF', counterpart: { extensions: ['.xlsx', '.xls', '.csv'], toolName: 'Excel to PDF', does: 'turn a spreadsheet into a PDF' } });
          return pdfToExcel(files[0]);
        }}
      />
      <ToolPageSEO slug="pdf-to-excel" />
    </>
  );
}
