import type { Metadata } from 'next';
import { SITE_NAME, SITE_URL } from './site';
import { getToolBySlug, tools } from './tools-data';

/** SEO data for every tool, keyed by slug. Only overrides where we need something specific. */
const toolSeo: Record<string, {
  title: string;
  description: string;
  keywords: string[];
  faqs: { q: string; a: string }[];
}> = {
  'pdf-workspace': {
    title: 'PDF Workspace — Edit, Sign, Redact & Secure PDFs Online',
    description: 'One PDF workspace to edit text, redact sensitive info, add signatures, stamp watermarks, and password-protect documents. All processing happens in your browser.',
    keywords: ['pdf workspace', 'edit pdf online', 'pdf editor free', 'sign pdf online', 'redact pdf'],
    faqs: [
      { q: 'What can I do in the PDF Workspace?', a: 'You can edit text, redact sensitive information, reorder pages, add signatures, stamp watermarks, adjust pages, password-protect the document, and download the result — all without leaving the page.' },
      { q: 'Is my document uploaded to a server?', a: 'No. Every action runs in your browser. Your document never leaves your device, making the workspace ideal for confidential and sensitive work.' },
    ],
  },
  'merge-pdf': {
    title: 'Merge PDF — Combine Multiple PDFs Into One (Free Online)',
    description: 'Combine two or more PDF files into a single document. Free, no sign-up, no watermarks. Merging happens in your browser — files are never uploaded.',
    keywords: ['merge pdf', 'combine pdf', 'join pdf', 'merge pdf files free', 'combine pdf online'],
    faqs: [
      { q: 'How many PDFs can I merge at once?', a: 'There is no fixed limit. The practical ceiling is your device memory. Dozens of ordinary documents are routine; hundreds of large scans are better done in batches.' },
      { q: 'Does merging reduce PDF quality?', a: 'No. A correct merge copies each page object into a new document without re-encoding images or text. Your pages remain identical to the originals.' },
      { q: 'Can I merge password-protected PDFs?', a: 'You need to unlock them first. Password-protected PDFs cannot be read until the password is removed.' },
    ],
  },
  'split-pdf': {
    title: 'Split PDF — Separate a PDF Into Individual Pages',
    description: 'Break a PDF into single pages or custom page ranges. Free, browser-based, no upload required. Download individual pages or groups instantly.',
    keywords: ['split pdf', 'separate pdf', 'split pdf into pages', 'extract pdf pages', 'divide pdf'],
    faqs: [
      { q: 'How do I split a PDF into specific page ranges?', a: 'Enter ranges like 1-5, 10, 15-20. The tool splits the document into separate files for each range.' },
      { q: 'Does splitting reduce quality?', a: 'No. Splitting copies whole page objects into new documents. Text stays selectable and images keep their original resolution.' },
    ],
  },
  'remove-pages': {
    title: 'Remove Pages From PDF — Delete Unwanted Pages Free',
    description: 'Delete specific pages from a PDF document. Select the pages you want to remove and download the updated file. Free, no sign-up.',
    keywords: ['remove pages from pdf', 'delete pdf pages', 'erase pdf pages', 'remove pdf pages free'],
    faqs: [
      { q: 'Can I remove multiple pages at once?', a: 'Yes. Enter multiple page numbers or ranges, and all selected pages will be removed in one step.' },
      { q: 'Is this the same as splitting?', a: 'No. Splitting creates separate files from selected pages. Removing deletes pages from the document while keeping the rest as a single file.' },
    ],
  },
  'extract-pages': {
    title: 'Extract Pages From PDF — Pull Out Specific Pages',
    description: 'Extract specific pages from a PDF into a new document. Choose individual pages, ranges, or a mix. The original PDF stays unchanged.',
    keywords: ['extract pages from pdf', 'pull pdf pages', 'get pages from pdf', 'extract pdf'],
    faqs: [
      { q: 'Does extraction change the original PDF?', a: 'No. Extraction reads the source and writes a new file. Your original remains untouched on disk.' },
      { q: 'Can I extract pages in a different order?', a: 'Yes. List the pages in the order you want them. Entering 9, 3, 5 produces a file with pages in that sequence.' },
    ],
  },
  'organize-pdf': {
    title: 'Organize PDF — Reorder, Rotate & Manage Pages',
    description: 'Reorder, rotate, and manage pages in a PDF. Drag and drop pages into any order, rotate individual pages, and download the reorganized file.',
    keywords: ['organize pdf', 'reorder pdf pages', 'rotate pdf pages', 'rearrange pdf'],
    faqs: [
      { q: 'Can I rotate individual pages?', a: 'Yes. Each page can be rotated independently — 90°, 180°, or 270° — while leaving other pages unchanged.' },
      { q: 'Can I mix pages from different PDFs?', a: 'The organize tool works on a single PDF. To combine pages from different files, use Merge PDF after extracting the pages you need.' },
    ],
  },
  'compress-pdf': {
    title: 'Compress PDF — Reduce File Size Without Losing Quality',
    description: 'Shrink PDF file size by up to 80% without visible quality loss. Free, browser-based compression. No uploads, no watermarks, no sign-up.',
    keywords: ['compress pdf', 'reduce pdf size', 'shrink pdf', 'pdf compressor free', 'compress pdf without losing quality'],
    faqs: [
      { q: 'Will compressing a PDF reduce its quality?', a: 'At the recommended compression level, images are re-encoded at 150 DPI — visually identical to the original for screen viewing and standard printing.' },
      { q: 'How much smaller will my PDF get?', a: 'Photo-heavy PDFs shrink 60-80%. Text-only files shrink 10-30%. Scanned documents can shrink up to 90%.' },
      { q: 'Can I compress a password-protected PDF?', a: 'You need to unlock it first. Compression tools cannot read encrypted files until the password is removed.' },
    ],
  },
  'optimize-pdf': {
    title: 'Optimize PDF — Speed Up PDF for Web & Faster Loading',
    description: 'Optimize PDF files for web delivery and faster loading. Reduce render time, flatten layers, and streamline the document structure.',
    keywords: ['optimize pdf', 'speed up pdf', 'pdf web optimization', 'pdf load faster'],
    faqs: [
      { q: 'What does PDF optimization do?', a: 'Optimization removes unused objects, flattens interactive layers, subsets fonts, and streamlines the internal structure for faster rendering.' },
      { q: 'Is optimization the same as compression?', a: 'Compression reduces file size by re-encoding images. Optimization focuses on structural improvements that speed up loading and rendering.' },
    ],
  },
  'repair-pdf': {
    title: 'Repair PDF — Fix Corrupted or Damaged PDF Files',
    description: 'Repair corrupted or damaged PDF files. Fix broken headers, recover readable content, and restore damaged documents. Free online tool.',
    keywords: ['repair pdf', 'fix corrupted pdf', 'recover pdf', 'damaged pdf fix'],
    faqs: [
      { q: 'What causes a PDF to become corrupted?', a: 'Common causes include incomplete downloads, storage media errors, software crashes during save, and virus damage.' },
      { q: 'Can repair recover all content?', a: 'Repair works by rebuilding the PDF structure. Recovery depends on how much of the original data remains intact.' },
    ],
  },
  'ocr-pdf': {
    title: 'OCR PDF — Extract Text From Scanned Documents',
    description: 'Convert scanned documents into searchable, selectable text using OCR. Make scanned PDFs searchable and editable. Free, no upload required.',
    keywords: ['ocr pdf', 'extract text from scanned pdf', 'scanned pdf to text', 'pdf ocr free'],
    faqs: [
      { q: 'What is OCR?', a: 'Optical Character Recognition (OCR) analyzes images of text and converts them into actual text characters, making scanned documents searchable and selectable.' },
      { q: 'How accurate is OCR?', a: 'Accuracy depends on scan quality. Clear, high-resolution scans typically achieve 95-99% accuracy. Poor quality scans may have more errors.' },
    ],
  },
  'jpg-to-pdf': {
    title: 'JPG to PDF — Convert Images to PDF Documents Free',
    description: 'Convert JPG images to PDF documents. Maintain original image quality. Combine multiple images into one PDF. Free, no sign-up required.',
    keywords: ['jpg to pdf', 'image to pdf', 'jpeg to pdf', 'photos to pdf', 'jpg to pdf converter'],
    faqs: [
      { q: 'Does converting JPG to PDF reduce image quality?', a: 'No. The image data is embedded into the PDF without re-compression. Your images remain pixel-identical to the originals.' },
      { q: 'Can I combine multiple images into one PDF?', a: 'Yes. Load all your JPGs, arrange them in order, and convert. Each image becomes one page in the resulting PDF.' },
    ],
  },
  'word-to-pdf': {
    title: 'Word to PDF — Convert DOCX to PDF Free Online',
    description: 'Convert Word documents (DOCX) to PDF. Preserve formatting, fonts, and layout. Free, browser-based, no upload required.',
    keywords: ['word to pdf', 'docx to pdf', 'convert word to pdf', 'word to pdf free'],
    faqs: [
      { q: 'Will my formatting be preserved?', a: 'Yes. The conversion maintains fonts, images, tables, and layout as closely as possible to the original Word document.' },
      { q: 'Do I need Microsoft Word installed?', a: 'No. The conversion happens in your browser. No software installation is required.' },
    ],
  },
  'powerpoint-to-pdf': {
    title: 'PowerPoint to PDF — Convert PPTX to PDF Free',
    description: 'Convert PowerPoint presentations (PPTX) to PDF. Preserve slide layout, images, and animations as static pages. Free, no sign-up.',
    keywords: ['powerpoint to pdf', 'pptx to pdf', 'convert powerpoint to pdf', 'slides to pdf'],
    faqs: [
      { q: 'Will animations be preserved?', a: 'Animations are converted to static pages since PDF does not support animations. The final state of each slide is captured.' },
      { q: 'Can I convert specific slides?', a: 'The conversion processes the entire presentation. To get specific slides, extract them after conversion using the Extract Pages tool.' },
    ],
  },
  'excel-to-pdf': {
    title: 'Excel to PDF — Convert Spreadsheets to PDF Free',
    description: 'Convert Excel spreadsheets (XLSX) to PDF. Preserve tables, formulas as values, and formatting. Free, browser-based conversion.',
    keywords: ['excel to pdf', 'xlsx to pdf', 'spreadsheet to pdf', 'convert excel to pdf'],
    faqs: [
      { q: 'Will my formulas be preserved?', a: 'Formulas are calculated and saved as their resulting values in the PDF. The formulas themselves are not preserved since PDF is a static format.' },
      { q: 'Can I convert specific worksheets?', a: 'The conversion processes the entire workbook. For specific sheets, you may need to save them as a separate file first.' },
    ],
  },
  'html-to-pdf': {
    title: 'HTML to PDF — Convert Web Pages to PDF Free',
    description: 'Convert any web page to PDF. Save articles, receipts, and online content as PDF documents. Free, browser-based, no installation.',
    keywords: ['html to pdf', 'web page to pdf', 'convert html to pdf', 'save webpage as pdf'],
    faqs: [
      { q: 'Can I convert any web page?', a: 'Yes. Enter the URL of any publicly accessible web page and it will be converted to PDF format.' },
      { q: 'Will the PDF look like the web page?', a: 'The PDF captures the rendered content of the page. Complex layouts may vary slightly from the original.' },
    ],
  },
  'pdf-to-jpg': {
    title: 'PDF to JPG — Convert PDF Pages to Images Free',
    description: 'Convert PDF pages to high-quality JPG images. Extract all pages or specific pages as images. Free, no sign-up, no watermarks.',
    keywords: ['pdf to jpg', 'pdf to image', 'pdf to jpeg', 'convert pdf to jpg', 'pdf pages to images'],
    faqs: [
      { q: 'What resolution will the images be?', a: 'Images are extracted at the highest resolution contained in the PDF, typically 150-300 DPI depending on the source.' },
      { q: 'Can I convert specific pages?', a: 'Yes. Choose to convert all pages or specify a page range to extract only the pages you need.' },
    ],
  },
  'pdf-to-word': {
    title: 'PDF to Word — Convert PDF to Editable DOCX Free',
    description: 'Convert PDF documents to editable Word files (DOCX). Preserve text, formatting, and layout. Free, browser-based, no upload required.',
    keywords: ['pdf to word', 'pdf to docx', 'convert pdf to word', 'pdf to editable'],
    faqs: [
      { q: 'Will the Word file be editable?', a: 'Yes. Text becomes editable, images are preserved, and layout is maintained as closely as possible.' },
      { q: 'Does this work on scanned PDFs?', a: 'Scanned PDFs need OCR first to extract the text. Run OCR, then convert the result to Word for best results.' },
    ],
  },
  'pdf-to-powerpoint': {
    title: 'PDF to PowerPoint — Convert PDF to Editable PPTX',
    description: 'Convert PDF documents to editable PowerPoint presentations (PPTX). Preserve layout and images. Free, no sign-up required.',
    keywords: ['pdf to powerpoint', 'pdf to pptx', 'convert pdf to powerpoint', 'pdf to slides'],
    faqs: [
      { q: 'Will each PDF page become a slide?', a: 'Yes. Each page in the PDF becomes one slide in the PowerPoint presentation.' },
      { q: 'Can I edit the resulting slides?', a: 'Yes. The output is a standard PPTX file that you can edit in any PowerPoint-compatible application.' },
    ],
  },
  'pdf-to-excel': {
    title: 'PDF to Excel — Convert PDF Tables to Spreadsheets',
    description: 'Extract tables from PDF documents into editable Excel spreadsheets (XLSX). Preserve table structure and data. Free, no sign-up.',
    keywords: ['pdf to excel', 'pdf table to excel', 'convert pdf to excel', 'pdf to spreadsheet'],
    faqs: [
      { q: 'How accurate is table extraction?', a: 'Accuracy depends on the table structure. Well-formatted tables extract cleanly. Complex or irregular tables may need manual adjustment.' },
      { q: 'Can I extract multiple tables?', a: 'Yes. The tool identifies and extracts all tables in the PDF, placing each in a separate worksheet.' },
    ],
  },
  'pdf-to-pdfa': {
    title: 'PDF to PDF/A — Convert to Archival PDF Format',
    description: 'Convert standard PDF files to PDF/A archival format. Ensure long-term preservation and compliance. Free, browser-based conversion.',
    keywords: ['pdf to pdfa', 'convert to pdf/a', 'archival pdf', 'pdf/a conversion'],
    faqs: [
      { q: 'What is PDF/A?', a: 'PDF/A is an ISO-standardized version of PDF designed for long-term archiving. It ensures documents can be reproduced exactly in the future.' },
      { q: 'Why should I convert to PDF/A?', a: 'Many industries require PDF/A for document retention. It ensures fonts are embedded, colors are defined, and the document is self-contained.' },
    ],
  },
  'pdf-to-markdown': {
    title: 'PDF to Markdown — Convert PDF Content to Markdown Text',
    description: 'Convert PDF documents to clean Markdown text. Preserve headings, lists, and formatting. Free, browser-based, no sign-up required.',
    keywords: ['pdf to markdown', 'convert pdf to markdown', 'pdf to md', 'pdf to text markdown'],
    faqs: [
      { q: 'Will formatting be preserved in Markdown?', a: 'Headings, bold, italic, lists, and tables are converted to their Markdown equivalents. Complex layouts are simplified.' },
      { q: 'Can I convert specific pages?', a: 'Yes. Specify a page range to convert only the sections you need.' },
    ],
  },
  'edit-pdf': {
    title: 'Edit PDF — Change Text, Headings & Numbers Free',
    description: 'Edit text, headings, and numbers in a PDF directly in your browser. Fix typos, update dates, and make changes without converting to Word.',
    keywords: ['edit pdf', 'pdf editor free', 'change pdf text', 'modify pdf', 'edit pdf online'],
    faqs: [
      { q: 'Can I edit any PDF?', a: 'Any digitally-created PDF with selectable text can be edited. Scanned PDFs need OCR first to make text editable.' },
      { q: 'Will editing change the formatting?', a: 'Direct editing preserves the original formatting. Only the text you change is affected — fonts, spacing, and layout remain intact.' },
    ],
  },
  'rotate-pdf': {
    title: 'Rotate PDF — Rotate PDF Pages to Any Angle',
    description: 'Rotate individual pages or all pages in a PDF. Fix sideways scans, correct orientation, and adjust page angles. Free, no sign-up.',
    keywords: ['rotate pdf', 'rotate pdf pages', 'turn pdf', 'fix pdf orientation'],
    faqs: [
      { q: 'Can I rotate individual pages?', a: 'Yes. Each page can be rotated independently — 90°, 180°, or 270° — while leaving other pages unchanged.' },
      { q: 'Will rotation affect print quality?', a: 'No. Rotation is a metadata change that instructs the viewer how to display the page. The content is not re-rendered.' },
    ],
  },
  'add-page-numbers': {
    title: 'Add Page Numbers to PDF — Insert Page Numbers Free',
    description: 'Add page numbers to any position in your PDF. Choose the format, position, and starting number. Free, browser-based, no upload required.',
    keywords: ['add page numbers to pdf', 'number pdf pages', 'page numbering pdf', 'insert page numbers'],
    faqs: [
      { q: 'Where can I place page numbers?', a: 'Choose from top-left, top-center, top-right, bottom-left, bottom-center, or bottom-right positions.' },
      { q: 'Can I skip numbering on the first page?', a: 'Yes. Select the option to start numbering from a specific page, such as page 2 or 3, to skip cover pages.' },
    ],
  },
  'add-watermark': {
    title: 'Add Watermark to PDF — Text & Image Watermarks Free',
    description: 'Add text or image watermarks to PDF documents. Customize opacity, position, and rotation. Free, no sign-up, no watermarks on output.',
    keywords: ['add watermark to pdf', 'pdf watermark', 'stamp pdf', 'watermark pdf free'],
    faqs: [
      { q: 'Can I adjust watermark opacity?', a: 'Yes. Control the transparency of your watermark from fully opaque to nearly invisible.' },
      { q: 'Can I watermark all pages at once?', a: 'Yes. The watermark is applied to every page in the document simultaneously.' },
    ],
  },
  'crop-pdf': {
    title: 'Crop PDF — Crop & Resize PDF Pages Free',
    description: 'Crop and resize PDF pages. Remove margins, adjust page dimensions, and trim content. Free, browser-based, no upload required.',
    keywords: ['crop pdf', 'resize pdf', 'trim pdf', 'crop pdf pages'],
    faqs: [
      { q: 'Can I crop all pages at once?', a: 'Yes. Apply the same crop area to every page, or set different crops for individual pages.' },
      { q: 'Does cropping delete content?', a: 'Cropping hides the content outside the crop area. The hidden content is not deleted and can be uncropped later.' },
    ],
  },
  'sign-pdf': {
    title: 'Sign PDF — Add Electronic Signatures Free Online',
    description: 'Add electronic signatures to PDF documents. Draw, type, or upload your signature. Legally valid, free, no sign-up required.',
    keywords: ['sign pdf', 'electronic signature pdf', 'sign pdf online free', 'add signature to pdf'],
    faqs: [
      { q: 'Are electronic signatures legally valid?', a: 'Yes. Electronic signatures are legally valid under the US ESIGN Act and EU eIDAS for virtually all documents.' },
      { q: 'Can I sign a password-protected PDF?', a: 'You need to unlock it first. Password-protected PDFs cannot be edited until the password is removed.' },
    ],
  },
  'redact-pdf': {
    title: 'Redact PDF — Black Out Sensitive Information Free',
    description: 'Permanently redact sensitive information from PDF documents. Black out text, images, and content. Free, browser-based, no upload required.',
    keywords: ['redact pdf', 'black out pdf', 'censor pdf', 'redact sensitive information'],
    faqs: [
      { q: 'Is redaction permanent?', a: 'Yes. Redaction permanently removes the selected content from the document. The underlying data is deleted, not just hidden.' },
      { q: 'Can redacted content be recovered?', a: 'No. Unlike simply blacking out text with a rectangle, proper redaction removes the content from the file structure entirely.' },
    ],
  },
  'unlock-pdf': {
    title: 'Unlock PDF — Remove Password Protection Free',
    description: 'Remove password protection from PDF documents. Unlock encrypted PDFs for editing, printing, or sharing. Free, no sign-up required.',
    keywords: ['unlock pdf', 'remove pdf password', 'decrypt pdf', 'unlock pdf free'],
    faqs: [
      { q: 'Do I need the password to unlock a PDF?', a: 'Yes. You must know the current password to remove it. There is no way to bypass PDF encryption without the password.' },
      { q: 'Will unlocking change the PDF content?', a: 'No. Unlocking only removes the password protection. The document content remains unchanged.' },
    ],
  },
  'protect-pdf': {
    title: 'Protect PDF — Add Password Protection Free',
    description: 'Add password protection to PDF documents. Encrypt your files with AES-256 encryption. Free, browser-based, no upload required.',
    keywords: ['protect pdf', 'password protect pdf', 'encrypt pdf', 'lock pdf', 'pdf password protection'],
    faqs: [
      { q: 'How strong is PDF password protection?', a: 'Modern PDF encryption uses AES-256, the same standard used by banks and governments. A strong password makes brute-force attacks impractical.' },
      { q: 'What happens if I forget the password?', a: 'There is no recovery mechanism. The file is permanently inaccessible without the password. Always store it somewhere safe.' },
    ],
  },
  'compare-pdf': {
    title: 'Compare PDF — Find Differences Between Two PDFs',
    description: 'Compare two PDF documents side by side. Highlight differences in text, images, and formatting. Free, browser-based, no upload required.',
    keywords: ['compare pdf', 'pdf diff', 'compare pdf files', 'find differences pdf'],
    faqs: [
      { q: 'What types of differences are detected?', a: 'Text changes, added or removed content, image differences, and formatting changes are all highlighted.' },
      { q: 'Can I compare scanned PDFs?', a: 'Scanned PDFs can be compared, but accuracy depends on OCR quality. Text-based PDFs produce more reliable comparisons.' },
    ],
  },
  'ai-summarizer': {
    title: 'AI PDF Summarizer — Summarize PDF Content Instantly',
    description: 'Summarize PDF documents using AI. Extract key points, main arguments, and essential information. Free, no sign-up required.',
    keywords: ['pdf summarizer', 'ai pdf summary', 'summarize pdf', 'pdf summary tool'],
    faqs: [
      { q: 'How accurate is the AI summary?', a: 'The AI identifies key points and main themes accurately. For critical documents, always review the summary against the original.' },
      { q: 'Is my document sent to a server?', a: 'The summarize tool may contact an online service for processing. Review the tool documentation for details on data handling.' },
    ],
  },
  'translate-pdf': {
    title: 'Translate PDF — Translate PDF Content to Any Language',
    description: 'Translate PDF documents to any language. Preserve formatting while translating text content. Free, no sign-up required.',
    keywords: ['translate pdf', 'pdf translation', 'translate pdf to english', 'pdf language translation'],
    faqs: [
      { q: 'How many languages are supported?', a: 'The translate tool supports dozens of major languages. Check the tool for the complete list of available languages.' },
      { q: 'Will formatting be preserved?', a: 'Text is translated while maintaining the document layout. Some formatting may shift if the translated text is significantly longer.' },
    ],
  },
};

/** Generate full metadata for a tool page. */
export function generateToolMetadata(slug: string): Metadata {
  const tool = getToolBySlug(slug);
  const seo = toolSeo[slug];
  
  if (!tool || !seo) {
    return {
      title: 'PDF Tool',
      description: 'Free PDF tool that runs in your browser.',
    };
  }

  const url = `/tools/${slug}`;
  
  return {
    title: seo.title,
    description: seo.description,
    keywords: seo.keywords,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      title: seo.title,
      description: seo.description,
      url,
      siteName: SITE_NAME,
    },
    twitter: {
      card: 'summary_large_image',
      title: seo.title,
      description: seo.description,
    },
  };
}

/** Get FAQs for a tool page (for schema markup). */
export function getToolFaqs(slug: string): { q: string; a: string }[] {
  return toolSeo[slug]?.faqs ?? [];
}

/** Get related tools for internal linking. */
export function getRelatedTools(slug: string, count = 4): { slug: string; name: string; description: string }[] {
  const tool = getToolBySlug(slug);
  if (!tool) return [];
  
  return tools
    .filter(t => t.slug !== slug && t.category === tool.category)
    .slice(0, count)
    .map(t => ({ slug: t.slug, name: t.name, description: t.description }));
}
