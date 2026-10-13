import type { Metadata } from 'next';
import { SITE_NAME, SITE_URL, pageTitle } from './site';
import { getToolBySlug, tools } from './tools-data';
import { languageAlternates } from '@/i18n/alternates';
import { toolOgImage } from '@/i18n/og';

/** SEO data for every tool, keyed by slug. Only overrides where we need something specific. */
const toolSeo: Record<string, {
  title: string;
  description: string;
  keywords: string[];
  faqs: { q: string; a: string }[];
}> = {
  'pdf-workspace': {
    title: 'PDF Workspace — Edit, Sign, Redact & Secure PDFs Online',
    description: 'One PDF workspace to edit text, redact sensitive info, add signatures, stamp watermarks and password-protect documents. Everything runs in your browser.',
    keywords: ['pdf workspace', 'edit pdf online', 'pdf editor free', 'sign pdf online', 'redact pdf'],
    faqs: [
      { q: 'What can I do in the PDF Workspace?', a: 'You can edit text, redact sensitive information, reorder pages, add signatures, stamp watermarks, adjust pages, password-protect the document, and download the result — all without leaving the page.' },
      { q: 'Is my document uploaded to a server?', a: 'No. Every action runs in your browser. Your document never leaves your device, making the workspace ideal for confidential and sensitive work.' },
      { q: 'Is the PDF Workspace free, and do I need an account?', a: 'It is free with no account, no watermark and no limit on how many documents you work on. Open a PDF and start editing.' },
    ],
  },
  'merge-pdf': {
    title: 'Merge PDF — Combine Multiple PDFs Into One (Free Online)',
    description: 'Combine two or more PDF files into a single document. Free, no sign-up, no watermarks. Merging happens in your browser — files are never uploaded.',
    keywords: ['merge pdf', 'combine pdf', 'join pdf', 'merge pdf files free', 'combine pdf online'],
    faqs: [
      { q: 'How many PDFs can I merge at once?', a: 'Up to 20 files per merge, with no size cap beyond your device memory. For more, merge in batches of 20, then merge the results together.' },
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
      { q: 'Can I split a PDF on my phone without an app?', a: 'Yes. Split PDF runs in the browser on Android and iPhone, so you can split a file without installing anything or uploading it.' },
    ],
  },
  'remove-pages': {
    title: 'Remove Pages From PDF — Delete Unwanted Pages Free',
    description: 'Delete specific pages from a PDF document. Select the pages you want to remove and download the updated file. Free, no sign-up.',
    keywords: ['remove pages from pdf', 'delete pdf pages', 'erase pdf pages', 'remove pdf pages free'],
    faqs: [
      { q: 'Can I remove multiple pages at once?', a: 'Yes. Enter multiple page numbers or ranges, and all selected pages will be removed in one step.' },
      { q: 'Is this the same as splitting?', a: 'No. Splitting creates separate files from selected pages. Removing deletes pages from the document while keeping the rest as a single file.' },
      { q: 'Is it safe to delete pages from a confidential PDF here?', a: 'Yes. The pages are removed in your browser and the file never leaves your device, so nothing is stored on a server.' },
    ],
  },
  'extract-pages': {
    title: 'Extract Pages From PDF — Pull Out Specific Pages',
    description: 'Extract specific pages from a PDF into a new document. Choose individual pages, ranges, or a mix. The original PDF stays unchanged.',
    keywords: ['extract pages from pdf', 'pull pdf pages', 'get pages from pdf', 'extract pdf'],
    faqs: [
      { q: 'Does extraction change the original PDF?', a: 'No. Extraction reads the source and writes a new file. Your original remains untouched on disk.' },
      { q: 'Can I extract pages in a different order?', a: 'Yes. List the pages in the order you want them. Entering 9, 3, 5 produces a file with pages in that sequence.' },
      { q: 'Is extracting pages free, with no watermark?', a: 'Yes. Extraction is free with no account, and the new PDF carries no watermark or added branding.' },
    ],
  },
  'organize-pdf': {
    title: 'Organize PDF — Reorder & Remove Pages Free',
    description: 'Put the pages of a PDF in any order and drop the ones you do not need, in one step. Free, no sign-up, and the file never leaves your browser.',
    keywords: ['organize pdf', 'reorder pdf pages', 'rotate pdf pages', 'rearrange pdf'],
    faqs: [
      { q: 'How do I set the new page order?', a: 'Type the page numbers in the order you want, for example 3, 1, 2, 4. The current order is filled in for you, and a preview shows the result before you save.' },
      { q: 'Can I rotate pages here?', a: 'No. Use Rotate PDF, which turns all pages or just the ones you list by 90°, 180° or 270°.' },
      { q: 'Can I mix pages from different PDFs?', a: 'The organize tool works on a single PDF. To combine pages from different files, use Merge PDF after extracting the pages you need.' },
    ],
  },
  'compress-pdf': {
    title: 'Compress PDF — Reduce File Size Without Losing Quality',
    description: 'Shrink PDF file size by up to 80% without visible quality loss. Free, browser-based compression. No uploads, no watermarks, no sign-up.',
    keywords: ['compress pdf', 'reduce pdf size', 'shrink pdf', 'pdf compressor free', 'compress pdf without losing quality'],
    faqs: [
      { q: 'Will compressing a PDF reduce its quality?', a: 'It depends on the size you ask for. The tool first tries a lossless rebuild that changes nothing visible. If that is not small enough, it redraws each page as an image at the highest resolution that fits your target, with an invisible text layer so the text stays searchable. A generous target looks identical; a very small one looks softer.' },
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
      { q: 'Will an optimized PDF still open in every PDF reader?', a: 'Yes. Optimization keeps the file a standard PDF, so it opens in Adobe Reader, browsers, Preview and mobile viewers as before.' },
    ],
  },
  'repair-pdf': {
    title: 'Repair PDF — Fix Corrupted or Damaged PDF Files',
    description: 'Repair corrupted or damaged PDF files. Fix broken headers, recover readable content, and restore damaged documents. Free online tool.',
    keywords: ['repair pdf', 'fix corrupted pdf', 'recover pdf', 'damaged pdf fix'],
    faqs: [
      { q: 'What causes a PDF to become corrupted?', a: 'Common causes include incomplete downloads, storage media errors, software crashes during save, and virus damage.' },
      { q: 'Can repair recover all content?', a: 'Repair works by rebuilding the PDF structure. Recovery depends on how much of the original data remains intact.' },
      { q: 'Is my damaged PDF uploaded for repair?', a: 'No. The repair runs in your browser, so a damaged contract or statement never leaves your device.' },
    ],
  },
  'ocr-pdf': {
    title: 'OCR PDF — Extract Text From Scanned Documents',
    description: 'Convert scanned documents into searchable, selectable text using OCR. Make scanned PDFs searchable and editable. Free, no upload required.',
    keywords: ['ocr pdf', 'extract text from scanned pdf', 'scanned pdf to text', 'pdf ocr free'],
    faqs: [
      { q: 'What is OCR?', a: 'Optical Character Recognition (OCR) analyzes images of text and converts them into actual text characters, making scanned documents searchable and selectable.' },
      { q: 'How accurate is OCR?', a: 'Accuracy depends on scan quality. Clear, high-resolution scans typically achieve 95-99% accuracy. Poor quality scans may have more errors.' },
      { q: 'Does OCR PDF upload my scans?', a: 'No. The recognition engine and its language data download to your browser once, then every page is read on your own device.' },
    ],
  },
  'jpg-to-pdf': {
    title: 'JPG to PDF — Convert Images to PDF Documents Free',
    description: 'Convert JPG images to PDF documents. Maintain original image quality. Combine multiple images into one PDF. Free, no sign-up required.',
    keywords: ['jpg to pdf', 'image to pdf', 'jpeg to pdf', 'photos to pdf', 'jpg to pdf converter'],
    faqs: [
      { q: 'Does converting JPG to PDF reduce image quality?', a: 'No. The image data is embedded into the PDF without re-compression. Your images remain pixel-identical to the originals.' },
      { q: 'Can I combine multiple images into one PDF?', a: 'Yes. Load all your JPGs, arrange them in order, and convert. Each image becomes one page in the resulting PDF.' },
      { q: 'Can I convert photos to PDF on my phone?', a: 'Yes. Open JPG to PDF in your phone\'s browser, pick photos from your gallery, and download one PDF. Nothing is uploaded.' },
    ],
  },
  'scan-pdf': {
    title: 'Scan to PDF Online Free — Camera Scanner, No App',
    description: 'Scan documents to PDF online with your phone camera: auto edge detection, crop, filters, OCR, ID and book modes. Free, no app, no sign-up, no upload.',
    keywords: ['scan to pdf online', 'scan document to pdf free', 'online camera scanner', 'scan to pdf no app', 'document scanner online', 'scan pdf'],
    faqs: [
      { q: 'Do I need an app or a scanner to make a PDF?', a: 'No. Open this page on your phone and point the camera at the page. It finds the edges, captures the page when you hold steady, straightens it and cleans up shadows. You can also import photos you already took.' },
      { q: 'Is my scanned document uploaded to a server?', a: 'No. The camera stream, page detection, filters and PDF creation all run in your browser. Pages are kept on this device so a reload does not lose them. The only download is the text-recognition language model, fetched once if you turn on OCR.' },
      { q: 'Can I make the scanned PDF searchable?', a: 'Yes. Leave "Recognize text (OCR)" on when you save. The recognized text is laid invisibly over each page image, so you can search, select and copy it. Accuracy depends on how sharp and well-lit the photo is.' },
      { q: 'What do the Book, ID card and Whiteboard modes do?', a: 'Book splits an open book into a left and a right page. ID card scans the front and then the back of a card and places both on one page at real size. Whiteboard whitens glare and boosts marker colours.' },
      { q: 'Can I fix a page after scanning it?', a: 'Yes. In Review you can drag the corners to re-crop, rotate, change the filter, adjust brightness and contrast, brush away marks, draw, highlight, add text or sign, retake, reorder or delete any page, and undo any change. Edits are applied to the original photo, so nothing loses quality.' },
      { q: 'Can I scan a business card into my contacts?', a: 'Yes. Use Business card mode, then tap Contact: the name, job title, company, phone, email and website are read from the card for you to check, and saved as a .vcf contact file your phone can import.' },
      { q: 'Can I password-protect the scan or save it as JPG?', a: 'Yes. When saving, tick "Protect with a password" to lock the PDF, or choose JPG to get one image per page. Saved PDFs are also kept in Recent scans on this device so you can download or share them again.' },
    ],
  },
  'word-to-pdf': {
    title: 'Word to PDF — Convert DOCX to PDF Free Online',
    description: 'Convert Word documents (DOCX) to PDF in your browser. Keeps your text, headings, lists and tables. Free, no sign-up, and no upload.',
    keywords: ['word to pdf', 'docx to pdf', 'convert word to pdf', 'word to pdf free'],
    faqs: [
      { q: 'Will my formatting be preserved?', a: 'Your text, headings, lists and tables come across, but the document is re-typeset rather than copied pixel for pixel, so custom fonts and complex page layouts will not match exactly. For a pixel-perfect copy, use File → Save as PDF in Word itself.' },
      { q: 'Do I need Microsoft Word installed?', a: 'No. The conversion happens in your browser. No software installation is required.' },
      { q: 'Is my Word document uploaded to convert it?', a: 'No. The DOCX file is read and turned into a PDF in your browser, so it never leaves your device.' },
    ],
  },
  'powerpoint-to-pdf': {
    title: 'PowerPoint to PDF — Convert PPTX to PDF Free',
    description: 'Convert PowerPoint presentations (PPTX) to PDF, one page per slide, with text, pictures and tables. Free, no sign-up, and no upload.',
    keywords: ['powerpoint to pdf', 'pptx to pdf', 'convert powerpoint to pdf', 'slides to pdf'],
    faqs: [
      { q: 'Will animations be preserved?', a: 'Animations are converted to static pages since PDF does not support animations. The final state of each slide is captured.' },
      { q: 'Can I convert specific slides?', a: 'The conversion processes the entire presentation. To get specific slides, extract them after conversion using the Extract Pages tool.' },
      { q: 'Is my presentation uploaded to convert it?', a: 'No. The PPTX file is converted in your browser and never leaves your device.' },
    ],
  },
  'excel-to-pdf': {
    title: 'Excel to PDF — Convert Spreadsheets to PDF Free',
    description: 'Convert Excel spreadsheets (XLSX or CSV) to PDF, each sheet fitted to the page width. Free, browser-based, no sign-up and no upload.',
    keywords: ['excel to pdf', 'xlsx to pdf', 'spreadsheet to pdf', 'convert excel to pdf'],
    faqs: [
      { q: 'Will my formulas be preserved?', a: 'Formulas are calculated and saved as their resulting values in the PDF. The formulas themselves are not preserved since PDF is a static format.' },
      { q: 'Can I convert specific worksheets?', a: 'The conversion processes the entire workbook. For specific sheets, you may need to save them as a separate file first.' },
      { q: 'Is my spreadsheet uploaded to convert it?', a: 'No. The XLSX file is read and turned into a PDF in your browser, so financial data never leaves your device.' },
    ],
  },
  'html-to-pdf': {
    title: 'HTML to PDF — Convert Web Pages to PDF Free',
    description: 'Convert any web page to PDF. Save articles, receipts, and online content as PDF documents. Free, browser-based, no installation.',
    keywords: ['html to pdf', 'web page to pdf', 'convert html to pdf', 'save webpage as pdf'],
    faqs: [
      { q: 'Can I convert a live web page from its URL?', a: 'No. HTML to PDF converts HTML you paste or an .html file you choose. For a live page, use your browser\'s Print > Save as PDF, or save the page as HTML and convert that file here.' },
      { q: 'Will the PDF look like the web page?', a: 'The PDF captures the rendered content of the page. Complex layouts may vary slightly from the original.' },
      { q: 'Do I need to install anything to convert HTML to PDF?', a: 'No. Paste the HTML or choose an .html file and the PDF is created in your browser, with no software, extension or account.' },
    ],
  },
  'pdf-to-jpg': {
    title: 'PDF to JPG — Convert PDF Pages to Images Free',
    description: 'Convert PDF pages to high-quality JPG images. Extract all pages or specific pages as images. Free, no sign-up, no watermarks.',
    keywords: ['pdf to jpg', 'pdf to image', 'pdf to jpeg', 'convert pdf to jpg', 'pdf pages to images'],
    faqs: [
      { q: 'What resolution will the images be?', a: 'Images are extracted at the highest resolution contained in the PDF, typically 150-300 DPI depending on the source.' },
      { q: 'Can I convert specific pages?', a: 'Yes. Choose to convert all pages or specify a page range to extract only the pages you need.' },
      { q: 'Is my PDF uploaded to convert it to JPG?', a: 'No. Each page is rendered to an image in your browser, so the PDF never leaves your device.' },
    ],
  },
  'pdf-to-word': {
    title: 'PDF to Word — Convert PDF to Editable DOCX Free',
    description: 'Turn the text of a PDF into an editable Word file (DOCX), page by page. Free, runs in your browser, no sign-up and no upload.',
    keywords: ['pdf to word', 'pdf to docx', 'convert pdf to word', 'pdf to editable'],
    faqs: [
      { q: 'Will the Word file keep the layout and images?', a: 'No. It carries the text across as editable headings and paragraphs, with a heading for each page; images and complex layouts are not rebuilt. It is built for reusing the words, not for a look-alike copy.' },
      { q: 'Does this work on scanned PDFs?', a: 'Scanned PDFs need OCR first to extract the text. Run OCR, then convert the result to Word for best results.' },
      { q: 'Is my PDF uploaded to convert it to Word?', a: 'No. The text is extracted and the DOCX is built in your browser, so the PDF never leaves your device.' },
    ],
  },
  'pdf-to-powerpoint': {
    title: 'PDF to PowerPoint — Convert PDF to Editable PPTX',
    description: 'Turn a PDF into editable PowerPoint slides (PPTX): headings become titles, paragraphs become bullets. Free, no sign-up, no upload.',
    keywords: ['pdf to powerpoint', 'pdf to pptx', 'convert pdf to powerpoint', 'pdf to slides'],
    faqs: [
      { q: 'Will each PDF page become a slide?', a: 'Usually. Each page starts a new slide, and a text-heavy page continues onto extra slides so nothing is cut off. Headings become slide titles and paragraphs become bullets.' },
      { q: 'Can I edit the resulting slides?', a: 'Yes. The output is a standard PPTX file that you can edit in any PowerPoint-compatible application.' },
      { q: 'Is my PDF uploaded to convert it to PowerPoint?', a: 'No. The slides are built in your browser, so the PDF never leaves your device.' },
    ],
  },
  'pdf-to-excel': {
    title: 'PDF to Excel — Export PDF Text to a Spreadsheet',
    description: 'Export the text of a PDF into an Excel workbook (XLSX): one sheet per page, one line of text per row. Free, in-browser, no sign-up.',
    keywords: ['pdf to excel', 'pdf table to excel', 'convert pdf to excel', 'pdf to spreadsheet'],
    faqs: [
      { q: 'Does it rebuild tables into columns?', a: 'No. Each line of text on a page goes into a single cell, so table rows land in one cell rather than separate columns. Use Excel\'s Text to Columns (or Power Query) to split them afterwards.' },
      { q: 'How is the workbook organized?', a: 'You get a Summary sheet with line and character counts per page, then one sheet per PDF page with each text line in its own row.' },
      { q: 'Does it work on scanned PDFs?', a: 'Only if the PDF has a text layer. For scanned pages, run OCR PDF first so there is text to export.' },
    ],
  },
  'pdf-to-pdfa': {
    title: 'PDF to PDF/A — Convert to Archival PDF Format',
    description: 'Convert standard PDF files to PDF/A archival format. Ensure long-term preservation and compliance. Free, browser-based conversion.',
    keywords: ['pdf to pdfa', 'convert to pdf/a', 'archival pdf', 'pdf/a conversion'],
    faqs: [
      { q: 'What is PDF/A?', a: 'PDF/A is an ISO-standardized version of PDF designed for long-term archiving. It ensures documents can be reproduced exactly in the future.' },
      { q: 'Why should I convert to PDF/A?', a: 'Many industries require PDF/A for document retention. It ensures fonts are embedded, colors are defined, and the document is self-contained.' },
      { q: 'Is the result guaranteed to pass a PDF/A validator?', a: 'Not always. The tool adds PDF/A identification metadata, but a source file with missing fonts or transparency may still fail strict checks, so verify with a validator such as veraPDF if an archive requires it.' },
    ],
  },
  'pdf-to-markdown': {
    title: 'PDF to Markdown — Convert PDF Content to Markdown Text',
    description: 'Convert the text of a PDF into a clean Markdown (.md) file for notes, docs and AI tools. Free, browser-based, no sign-up required.',
    keywords: ['pdf to markdown', 'convert pdf to markdown', 'pdf to md', 'pdf to text markdown'],
    faqs: [
      { q: 'Will formatting be preserved in Markdown?', a: 'The text comes across in reading order as plain Markdown. Complex layouts, tables and images are simplified, so check the preview before relying on the structure.' },
      { q: 'Can I convert specific pages?', a: 'The whole document is converted. To convert only some pages, run Extract Pages first and convert that file.' },
      { q: 'Can I use the Markdown with ChatGPT or other AI tools?', a: 'Yes. Markdown keeps headings and lists as plain text, which AI assistants and note apps read cleanly. The conversion itself runs in your browser.' },
    ],
  },
  'edit-pdf': {
    title: 'Edit PDF — Change Text, Headings & Numbers Free',
    description: 'Edit text, headings, and numbers in a PDF directly in your browser. Fix typos, update dates, and make changes without converting to Word.',
    keywords: ['edit pdf', 'pdf editor free', 'change pdf text', 'modify pdf', 'edit pdf online'],
    faqs: [
      { q: 'Can I edit any PDF?', a: 'Any digitally-created PDF with selectable text can be edited. Scanned PDFs need OCR first to make text editable.' },
      { q: 'Will editing change the formatting?', a: 'Direct editing preserves the original formatting. Only the text you change is affected — fonts, spacing, and layout remain intact.' },
      { q: 'Can I edit a scanned PDF?', a: 'Not directly. A scan is a picture of text, so there are no words to change in place. Use OCR PDF to make it searchable and copy the text out, then edit it in a word processor.' },
    ],
  },
  'rotate-pdf': {
    title: 'Rotate PDF — Rotate PDF Pages to Any Angle',
    description: 'Rotate individual pages or all pages in a PDF. Fix sideways scans, correct orientation, and adjust page angles. Free, no sign-up.',
    keywords: ['rotate pdf', 'rotate pdf pages', 'turn pdf', 'fix pdf orientation'],
    faqs: [
      { q: 'Can I rotate individual pages?', a: 'Yes. Each page can be rotated independently — 90°, 180°, or 270° — while leaving other pages unchanged.' },
      { q: 'Will rotation affect print quality?', a: 'No. Rotation is a metadata change that instructs the viewer how to display the page. The content is not re-rendered.' },
      { q: 'Is the rotation permanent?', a: 'Yes. The new orientation is saved in the downloaded PDF, so it opens the right way up in every viewer.' },
    ],
  },
  'add-page-numbers': {
    title: 'Add Page Numbers to PDF — Insert Page Numbers Free',
    description: 'Add page numbers to any position in your PDF. Choose the format, position, and starting number. Free, browser-based, no upload required.',
    keywords: ['add page numbers to pdf', 'number pdf pages', 'page numbering pdf', 'insert page numbers'],
    faqs: [
      { q: 'Where can I place page numbers?', a: 'Choose from top-left, top-center, top-right, bottom-left, bottom-center, or bottom-right positions.' },
      { q: 'Can I skip numbering on the first page?', a: 'Yes. Select the option to start numbering from a specific page, such as page 2 or 3, to skip cover pages.' },
      { q: 'Is my PDF uploaded to add page numbers?', a: 'No. The numbers are drawn onto the pages in your browser, so the file never leaves your device.' },
    ],
  },
  'add-watermark': {
    title: 'Add Watermark to PDF — Free Text Watermark Tool',
    description: 'Stamp a text watermark such as CONFIDENTIAL or DRAFT on every page of a PDF. Set opacity and size. Free, no sign-up, and no upload.',
    keywords: ['add watermark to pdf', 'pdf watermark', 'stamp pdf', 'watermark pdf free'],
    faqs: [
      { q: 'Can I adjust watermark opacity?', a: 'Yes. Control the transparency of your watermark from fully opaque to nearly invisible.' },
      { q: 'Can I watermark all pages at once?', a: 'Yes. The watermark is applied to every page in the document simultaneously.' },
      { q: 'Can a watermark be removed later?', a: 'A text watermark is drawn into the page content, so it cannot be switched off like a comment. Someone with editing software can still cover it, so treat it as a deterrent rather than protection.' },
    ],
  },
  'crop-pdf': {
    title: 'Crop PDF — Crop & Resize PDF Pages Free',
    description: 'Crop and resize PDF pages. Remove margins, adjust page dimensions, and trim content. Free, browser-based, no upload required.',
    keywords: ['crop pdf', 'resize pdf', 'trim pdf', 'crop pdf pages'],
    faqs: [
      { q: 'Can I crop all pages at once?', a: 'Yes. Apply the same crop area to every page, or set different crops for individual pages.' },
      { q: 'Does cropping delete content?', a: 'Cropping hides the content outside the crop area. The hidden content is not deleted and can be uncropped later.' },
      { q: 'Can I crop a PDF on my phone?', a: 'Yes. Crop PDF runs in your phone\'s browser, so you can trim margins without installing an app or uploading the file.' },
    ],
  },
  'sign-pdf': {
    title: 'Sign PDF — Add Electronic Signatures Free Online',
    description: 'Add electronic signatures to PDF documents. Draw, type, or upload your signature. Legally valid, free, no sign-up required.',
    keywords: ['sign pdf', 'electronic signature pdf', 'sign pdf online free', 'add signature to pdf'],
    faqs: [
      { q: 'Are electronic signatures legally valid?', a: 'Yes. Electronic signatures are legally valid under the US ESIGN Act and EU eIDAS for virtually all documents.' },
      { q: 'Can I sign a password-protected PDF?', a: 'You need to unlock it first. Password-protected PDFs cannot be edited until the password is removed.' },
      { q: 'How can I create my signature?', a: 'Draw it with a mouse or finger, type your name in a handwriting font, or upload a photo of your real signature. It is placed on the page in your browser and never stored on a server.' },
    ],
  },
  'redact-pdf': {
    title: 'Redact PDF Free — Black Out Text, No Upload',
    description: 'Redact a PDF free in your browser: draw boxes over names, numbers or signatures and they are permanently removed. No upload, no account, no watermark.',
    keywords: ['redact pdf', 'redact pdf free', 'black out pdf', 'censor pdf', 'pdf redaction tool', 'redact pdf without uploading'],
    faqs: [
      { q: 'Is redaction permanent?', a: 'Yes. Every page you mark is re-drawn as a flat image with your black boxes burned in, so the text, images and hidden layers underneath are not carried into the new file. Pages you do not mark are copied across untouched.' },
      { q: 'Can redacted content be recovered?', a: 'No. Unlike drawing a black rectangle over text, which leaves the text underneath selectable, the marked pages are rebuilt from a blacked-out image and the original page content is discarded. Test it: try to copy from a redacted area — nothing comes back.' },
      { q: 'Is my document uploaded anywhere?', a: 'No. The redaction runs entirely in your browser tab, so the file never leaves your device. That matters most for exactly the documents people redact: IDs, medical records, contracts and bank statements.' },
      { q: 'Will the rest of a redacted page still be selectable text?', a: 'No. A page you mark becomes an image as a whole, so its remaining text can no longer be selected or searched. Run OCR afterwards if you need it searchable again; unmarked pages keep their text.' },
      { q: 'Can I black out an entire page?', a: 'Yes. Switch to "Whole pages" and click each page that must go. It stays in the document as a solid black page, so page count and numbering do not change.' },
    ],
  },
  'unlock-pdf': {
    title: 'Unlock PDF — Remove Password Protection Free',
    description: 'Remove password protection from PDF documents. Unlock encrypted PDFs for editing, printing, or sharing. Free, no sign-up required.',
    keywords: ['unlock pdf', 'remove pdf password', 'decrypt pdf', 'unlock pdf free'],
    faqs: [
      { q: 'Do I need the password to unlock a PDF?', a: 'Yes. You must know the current password to remove it. There is no way to bypass PDF encryption without the password.' },
      { q: 'Will unlocking change the PDF content?', a: 'No. Unlocking only removes the password protection. The document content remains unchanged.' },
      { q: 'Is it safe to enter my PDF password here?', a: 'Yes. The password and the file stay in your browser and are never sent to a server.' },
    ],
  },
  'protect-pdf': {
    title: 'Protect PDF — Add Password Protection Free',
    description: 'Add a password to a PDF so it can\'t be opened without it. Standard 128-bit PDF encryption, applied in your browser. Free, no sign-up, no upload required.',
    keywords: ['protect pdf', 'password protect pdf', 'encrypt pdf', 'lock pdf', 'pdf password protection'],
    faqs: [
      { q: 'How strong is PDF password protection?', a: 'Slate PDF applies standard 128-bit RC4 PDF encryption, which every PDF reader can open. It stops casual access, but RC4 is an older algorithm: for highly sensitive files use a long, unique password, or a tool that offers AES-256.' },
      { q: 'What happens if I forget the password?', a: 'There is no recovery mechanism. The file is permanently inaccessible without the password. Always store it somewhere safe.' },
      { q: 'Is my PDF uploaded to add a password?', a: 'No. Encryption happens in your browser, so the unprotected file and the password never leave your device.' },
    ],
  },
  'compare-pdf': {
    title: 'Compare PDF — Find Differences Between Two PDFs',
    description: 'Check whether two PDFs match: get a similarity score and the exact pages that differ. Free, browser-based, no upload required.',
    keywords: ['compare pdf', 'pdf diff', 'compare pdf files', 'find differences pdf'],
    faqs: [
      { q: 'What does the comparison show?', a: 'Whether the two files are identical, a similarity percentage, which page numbers differ, and each file\'s page count, size and document details. It points you to the changed pages rather than marking up individual words.' },
      { q: 'Can I compare scanned PDFs?', a: 'Run OCR PDF on both scans first. Comparison works on the text inside the files, so image-only scans have nothing to compare.' },
      { q: 'Are both PDFs uploaded to compare them?', a: 'No. Both files are read and compared in your browser, so neither one leaves your device.' },
    ],
  },
  'ai-summarizer': {
    title: 'PDF Summarizer — Summarize a PDF Free, No Upload',
    description: 'Get the key points and top topics of a PDF in seconds. The summary is worked out on your device, so the document is never uploaded. Free.',
    keywords: ['pdf summarizer', 'ai pdf summary', 'summarize pdf', 'pdf summary tool'],
    faqs: [
      { q: 'How does the summarizer work?', a: 'It scores every sentence by how many of the document\'s key terms it contains and keeps the strongest ones as key points. The words are the author\'s own, not rewritten by a chatbot — always check important documents against the original.' },
      { q: 'Is my document sent to a server?', a: 'No. The summary is computed in your browser, and the PDF never leaves your device.' },
      { q: 'Can it summarize a scanned PDF?', a: 'Not directly. A scanned PDF has no text layer to read. Run it through OCR PDF first, then summarize the searchable result.' },
    ],
  },
  'translate-pdf': {
    title: 'Translate PDF — Translate PDF Content to Any Language',
    description: 'Translate the text of a PDF into 42 languages and download it as a new PDF. Free, no sign-up. Text is sent to a translation service.',
    keywords: ['translate pdf', 'pdf translation', 'translate pdf to english', 'pdf language translation'],
    faqs: [
      { q: 'How many languages are supported?', a: '42, with automatic detection of the source language.' },
      { q: 'Will formatting be preserved?', a: 'No. You get the translated text on screen and as a new text-only PDF; the original layout and images are not rebuilt.' },
      { q: 'Is my document uploaded?', a: 'This is the one Slate PDF tool that sends data online: the extracted text goes to a free public translation service. Do not use it for confidential documents.' },
    ],
  },
  'heic-to-pdf': {
    title: 'HEIC to PDF — Convert Apple HEIC Images to PDF Free',
    description: 'Convert HEIC and HEIF photos from iPhone and iPad to PDF documents. Free, browser-based, no upload required. Preserves original image quality.',
    keywords: ['heic to pdf', 'convert heic to pdf', 'heif to pdf', 'iphone photo to pdf', 'heic converter'],
    faqs: [
      { q: 'What is a HEIC file?', a: 'HEIC (High Efficiency Image Container) is the default image format used by iPhones and iPads since iOS 11. It offers better compression than JPEG but is not universally supported by all software.' },
      { q: 'Can I convert HEIC to PDF on my phone?', a: 'Yes. The browser-based tool works on iPhone and Android. Open it in Safari or Chrome, select your HEIC photos, and download the PDF.' },
      { q: 'Does conversion reduce image quality?', a: 'No. The HEIC image is decoded and embedded into the PDF at its original resolution. The visual quality is preserved.' },
    ],
  },
  'webp-to-pdf': {
    title: 'WebP to PDF — Convert WebP Images to PDF Free Online',
    description: 'Convert WebP images to PDF documents in your browser. Free, no sign-up, no watermarks. Supports batch conversion with original quality preservation.',
    keywords: ['webp to pdf', 'convert webp to pdf', 'webp to pdf converter', 'webp image to pdf', 'convert webp to pdf free'],
    faqs: [
      { q: 'What is a WebP file?', a: 'WebP is a modern image format developed by Google that provides superior compression for images on the web. It is widely used in web design and online content.' },
      { q: 'Does converting WebP to PDF reduce quality?', a: 'No. The WebP image is decoded and embedded into the PDF at its original resolution without re-compression.' },
      { q: 'Can I convert multiple WebP files at once?', a: 'Yes. Select multiple WebP images and they will be combined into a single multi-page PDF with one image per page.' },
    ],
  },
  'tiff-to-pdf': {
    title: 'TIFF to PDF — Convert TIFF Images to PDF Free Online',
    description: 'Convert TIFF and TIF images to PDF documents. Supports multi-page TIFFs. Free, browser-based processing with no file upload required.',
    keywords: ['tiff to pdf', 'convert tiff to pdf', 'tif to pdf', 'tiff to pdf converter', 'multi-page tiff to pdf'],
    faqs: [
      { q: 'Does this support multi-page TIFF files?', a: 'Yes. Multi-page TIFF files are split into individual pages, each becoming a separate page in the resulting PDF.' },
      { q: 'What TIFF compression types are supported?', a: 'The tool handles uncompressed, LZW, and PackBits TIFF files. JPEG-compressed TIFFs are also supported.' },
      { q: 'Can I convert multiple TIFF files at once?', a: 'Yes. Select multiple TIFF files and each will be converted, with all pages combined into a single PDF.' },
    ],
  },
  'svg-to-pdf': {
    title: 'SVG to PDF — Convert SVG Vector Images to PDF Free',
    description: 'Convert SVG files to PDF in your browser. Free, no upload, no sign-up — your SVG files never leave your device. Sharp high-res output, one or many files.',
    keywords: ['svg to pdf', 'convert svg to pdf', 'svg to pdf converter', 'svg image to pdf', 'vector to pdf'],
    faqs: [
      { q: 'Does converting SVG to PDF preserve vector quality?', a: 'No — the SVG is rendered to a high-resolution image (up to 3x its own size) and placed on a page of the original dimensions, so it stays sharp on screen and in print but is no longer editable vector art. For true vector output, export to PDF from a vector editor such as Inkscape or Illustrator.' },
      { q: 'Can I convert SVG files with external resources?', a: 'SVGs that reference external images or fonts may not render completely. Self-contained SVGs with embedded resources work best.' },
      { q: 'Is this free to use?', a: 'Yes. SVG to PDF conversion is completely free with no limits, no watermarks, and no sign-up required.' },
    ],
  },
  'epub-to-pdf': {
    title: 'EPUB to PDF — Convert EPUB Ebooks to PDF Free Online',
    description: 'Convert EPUB ebooks to PDF documents in your browser. Choose between an image-based layout or a selectable-text output. Free, no software installation.',
    keywords: ['epub to pdf', 'convert epub to pdf', 'epub to pdf converter', 'ebook to pdf', 'epub to pdf free'],
    faqs: [
      { q: 'What is an EPUB file?', a: 'EPUB (Electronic Publication) is a widely-used ebook format supported by most e-readers and reading apps. It contains HTML-based content with CSS styling.' },
      { q: 'What is the difference between design and text mode?', a: 'Exact design mode renders each chapter as an image, keeping its layout, images and inline styling; linked stylesheets and embedded custom fonts are not loaded, so those parts fall back to default fonts and styles. Selectable text mode extracts the text content and reflows it into a clean, selectable-text PDF.' },
      { q: 'Does this work with DRM-protected EPUBs?', a: 'No. DRM-protected EPUBs cannot be converted. Only unprotected EPUB files are supported.' },
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
    title: pageTitle(seo.title),
    description: seo.description,
    keywords: seo.keywords,
    alternates: { canonical: url, languages: languageAlternates({ kind: 'tool', slug }) },
    openGraph: {
      type: 'website',
      title: seo.title,
      description: seo.description,
      url,
      siteName: SITE_NAME,
      images: [{ url: toolOgImage('en', slug), width: 1200, height: 630, alt: `${SITE_NAME} — ${tool.name}` }],
    },
    twitter: {
      card: 'summary_large_image',
      title: seo.title,
      description: seo.description,
      images: [toolOgImage('en', slug)],
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

/** Raw SEO record for a tool (title, description, keywords, FAQs). */
export function getToolSeo(slug: string) {
  return toolSeo[slug];
}
