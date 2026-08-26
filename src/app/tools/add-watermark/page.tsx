import type { Metadata } from 'next';
import ToolPageSEO from '@/components/ToolPageSEO';
import { generateToolMetadata, getToolFaqs } from '@/lib/tool-seo';
import { generateSoftwareApplicationSchema, generateFAQSchema } from '@/lib/schema';
import { getToolBySlug } from '@/lib/tools-data';
import AddWatermarkTool from '@/components/tools/AddWatermarkTool';

export async function generateMetadata(): Promise<Metadata> {
  return generateToolMetadata('add-watermark');
}

export default function AddWatermarkPage() {
  const tool = getToolBySlug('add-watermark');
  const faqs = getToolFaqs('add-watermark');

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateSoftwareApplicationSchema({ name: tool!.name, description: tool!.description, slug: 'add-watermark', category: tool!.category })) }} />
      {faqs.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(generateFAQSchema(faqs)) }} />}
      <AddWatermarkTool />
      <ToolPageSEO slug="add-watermark" />
    </>
  );
}
