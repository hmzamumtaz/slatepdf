import { getToolBySlug } from './tools-data';

export interface ToolHowTo {
  /** The H2, phrased the way people search: "How to merge PDF files". */
  title: string;
  /** One or two sentences unique to this tool. */
  intro: string;
  /** What the user actually does in this tool's interface. */
  steps: string[];
  benefits: string[];
}

const PRIVATE = 'Private — the file is processed in your browser and never uploaded';
const FREE = 'Free, with no account, no watermark and no daily limit';

/**
 * Tool-specific how-to content, so no two tool pages share the same body copy.
 * Steps describe what each tool's interface really does; keep them in sync
 * when a tool's options change.
 */
const howTos: Record<string, Omit<ToolHowTo, 'benefits'> & { benefits?: string[] }> = {
  'pdf-workspace': {
    title: 'How to edit, sign and protect a PDF in one place',
    intro: 'The PDF Workspace puts editing, redaction, page tools, signatures, stamps and passwords on one screen, with undo and redo, so you finish a document in one pass and download it once.',
    steps: [
      'Open your PDF in the workspace above (unlock it first if it has a password)',
      'Use the Edit, Redact, Pages, Sign, Stamp, Adjust and Protect tabs in any order',
      'Step back or forward through your history if you change your mind',
      'Click Download to save the finished PDF',
    ],
  },
  'merge-pdf': {
    title: 'How to merge PDF files',
    intro: 'Merge PDF joins two or more PDFs into one document in the order you select them. Pages are copied as they are, so text stays selectable and images keep their resolution.',
    steps: [
      'Select or drop at least two PDF files, up to 20 at a time, in the order you want them',
      'Check the list, and remove any file you added by mistake',
      'Click Merge PDFs',
      'Download the combined PDF',
    ],
    benefits: [PRIVATE, FREE, 'Lossless — pages are copied, not re-rendered'],
  },
  'split-pdf': {
    title: 'How to split a PDF',
    intro: 'Split PDF cuts one document into several files by page range. Each range you type becomes its own PDF.',
    steps: [
      'Choose the PDF you want to split',
      'Type the page ranges, for example 1-3, 5, 7-10, and check the preview',
      'Click Split PDF',
      'Download each part, or use Download All to get every part in one ZIP',
    ],
    benefits: [PRIVATE, FREE, 'Lossless — every page keeps its original text and images'],
  },
  'remove-pages': {
    title: 'How to remove pages from a PDF',
    intro: 'Remove Pages deletes the pages you list and keeps everything else in a single PDF, in the original order.',
    steps: [
      'Choose your PDF',
      'Type the pages to delete, for example 1, 3, 5-8',
      'Check the preview of the pages that will remain',
      'Click Remove Pages and download the shorter PDF',
    ],
  },
  'extract-pages': {
    title: 'How to extract pages from a PDF',
    intro: 'Extract Pages copies the pages you choose into a new PDF and leaves the original file untouched.',
    steps: [
      'Choose your PDF',
      'Type the pages you want, for example 1, 3, 5-8, and check the thumbnails',
      'Click Extract Pages',
      'Download the new PDF that contains only those pages',
    ],
  },
  'organize-pdf': {
    title: 'How to reorder pages in a PDF',
    intro: 'Organize PDF rebuilds a document in the page order you type. Any page you leave out of the list is dropped, so you can reorder and trim in one step.',
    steps: [
      'Choose your PDF — the current order (1, 2, 3 …) is filled in for you',
      'Rewrite the list in the order you want, for example 3, 1, 2, 4',
      'Check the preview of the new order',
      'Click Organize PDF and download the result',
    ],
  },
  'compress-pdf': {
    title: 'How to compress a PDF to a specific size',
    intro: 'Compress PDF works towards a target size you set, in MB or KB, instead of vague "low / medium / high" levels — useful when an upload form or email has a hard limit.',
    steps: [
      'Choose the PDF you want to shrink',
      'Type a target size, or pick a quick preset of 50%, 25%, 10% or 5% of the original',
      'Click Compress',
      'Check the new size, then download the compressed PDF',
    ],
    benefits: [
      PRIVATE,
      FREE,
      'Honest about trade-offs: the tool warns you when a target is so small that pages must become images',
    ],
  },
  'optimize-pdf': {
    title: 'How to optimize a PDF without losing quality',
    intro: 'Optimize PDF repacks the file structure — object streams, unused objects — without touching images or text. If there is nothing to gain, it returns your file unchanged and says so.',
    steps: [
      'Choose one or more PDFs',
      'Tick "Remove document metadata" if you also want title, author and similar fields cleared',
      'Click Optimize PDF',
      'Download the optimized file, or use Compress PDF if you need a bigger reduction',
    ],
  },
  'repair-pdf': {
    title: 'How to repair a corrupted PDF',
    intro: 'Repair PDF rebuilds a damaged file\'s cross-reference table, object numbering and trailer. If the structure cannot be recovered, it re-renders the pages into a new PDF with a searchable text layer.',
    steps: [
      'Choose the PDF that will not open or shows errors',
      'Click Repair PDF',
      'Download the repaired file and open it to check every page',
    ],
  },
  'ocr-pdf': {
    title: 'How to make a scanned PDF searchable with OCR',
    intro: 'OCR PDF recognizes the text in scanned pages and adds it to the PDF, so you can search, select and copy it. You can pick up to three document languages from 44.',
    steps: [
      'Choose your scanned PDF',
      'Search for and select the document language — up to three for mixed-language files',
      'Click Start OCR and wait while each page is read',
      'Download the searchable PDF',
    ],
    benefits: [PRIVATE, FREE, 'Recognition runs on your own device, so sensitive scans stay with you'],
  },
  'jpg-to-pdf': {
    title: 'How to convert JPG to PDF',
    intro: 'JPG to PDF combines JPEG, PNG and WebP images into a single PDF, one image per page, in the order you add them.',
    steps: [
      'Select or drop your images, up to 20 at a time, in the order you want the pages',
      'Click Convert to PDF',
      'Download one PDF that contains every image',
    ],
  },
  'scan-pdf': {
    title: 'How to scan a document to PDF with your phone',
    intro: 'Scan PDF turns your phone or laptop camera into a document scanner: it finds the page edges, straightens the page and cleans it up, then saves a PDF you can make searchable.',
    steps: [
      'Allow camera access, or add photos you already took',
      'Hold the page in view — the edges are detected and the page is cropped and straightened',
      'Review each page: re-crop, rotate, pick a filter such as B&W or Whiteboard, or retake it',
      'Choose the page size and file size, turn on text recognition (OCR) if you want it, and save as PDF or JPG',
    ],
    benefits: [PRIVATE, FREE, 'Scans stay on your device, including the copies kept in Recent scans'],
  },
  'word-to-pdf': {
    title: 'How to convert Word to PDF',
    intro: 'Word to PDF turns .docx files into PDFs in your browser. It keeps your text, headings, lists and tables, but re-typesets them, so complex layouts and custom fonts will not match the original exactly.',
    steps: [
      'Choose one or more .docx files',
      'Click Convert to PDF',
      'Download each PDF, or use Download All for a ZIP',
    ],
  },
  'powerpoint-to-pdf': {
    title: 'How to convert PowerPoint to PDF',
    intro: 'PowerPoint to PDF redraws each slide of a .pptx file on its own page, with its text, pictures, tables and grouped shapes.',
    steps: [
      'Choose one or more .pptx files',
      'Click Convert to PDF',
      'Download the PDF — one page per slide',
    ],
  },
  'excel-to-pdf': {
    title: 'How to convert Excel to PDF',
    intro: 'Excel to PDF turns .xlsx and .csv files into PDFs. Each visible sheet is fitted to the page width, and portrait or landscape is chosen for you.',
    steps: [
      'Choose one or more .xlsx or .csv files (save old .xls files as .xlsx first)',
      'Click Convert to PDF',
      'Download the PDF; very large sheets show their first 3,000 rows',
    ],
  },
  'html-to-pdf': {
    title: 'How to convert HTML to PDF',
    intro: 'HTML to PDF takes pasted HTML or an uploaded .html file and produces a PDF, either matching the design or as simplified, selectable text.',
    steps: [
      'Paste your HTML code, or upload an .html file',
      'Check the design preview',
      'Choose Exact design or Selectable text',
      'Click Convert to PDF to download it',
    ],
  },
  'heic-to-pdf': {
    title: 'How to convert HEIC to PDF',
    intro: 'HEIC to PDF turns iPhone and iPad photos saved as HEIC or HEIF into PDFs, without installing anything or sending your photos anywhere.',
    steps: [
      'Select your HEIC or HEIF photos',
      'Click Convert to PDF — each photo becomes its own PDF',
      'Download them one by one, or all at once as a ZIP',
    ],
  },
  'webp-to-pdf': {
    title: 'How to convert WebP to PDF',
    intro: 'WebP to PDF turns WebP images — the format many websites now serve — into PDFs, one PDF per image.',
    steps: [
      'Select one or more WebP images',
      'Click Convert to PDF',
      'Download each PDF, or use Download All for a ZIP',
    ],
  },
  'tiff-to-pdf': {
    title: 'How to convert TIFF to PDF',
    intro: 'TIFF to PDF converts TIFF images, common from scanners and fax software, into PDFs, one PDF per file.',
    steps: [
      'Select one or more TIFF files',
      'Click Convert to PDF',
      'Download each PDF, or use Download All for a ZIP',
    ],
  },
  'svg-to-pdf': {
    title: 'How to convert SVG to PDF',
    intro: 'SVG to PDF turns SVG graphics into PDFs, one PDF per file — handy for sending logos and diagrams to people who cannot open SVG.',
    steps: [
      'Select one or more SVG files',
      'Click Convert to PDF',
      'Download each PDF, or use Download All for a ZIP',
    ],
  },
  'epub-to-pdf': {
    title: 'How to convert EPUB to PDF',
    intro: 'EPUB to PDF turns an ebook into a PDF you can print or read anywhere. Choose an exact-design copy or a simpler one with selectable text.',
    steps: [
      'Choose your .epub file (DRM-free ebooks only)',
      'Pick Exact design or Selectable text',
      'Click Convert to PDF to download it',
    ],
  },
  'pdf-to-jpg': {
    title: 'How to convert PDF to JPG',
    intro: 'PDF to JPG saves every page of a PDF as an image, in JPEG or PNG, at standard (144 DPI) or high (216 DPI) resolution.',
    steps: [
      'Choose one or more PDFs',
      'Pick JPEG or PNG, and Standard or High resolution',
      'Click Convert to Images',
      'Download single pages, or every page together as a ZIP',
    ],
  },
  'pdf-to-word': {
    title: 'How to convert PDF to Word',
    intro: 'PDF to Word pulls the text out of a PDF into an editable .docx, with a heading for each page. It moves text, not layout: images and complex formatting are not carried over.',
    steps: [
      'Choose one or more PDFs (run OCR PDF first on scanned documents)',
      'Click Convert to Word',
      'Download the .docx and open it in Word, Google Docs or LibreOffice',
    ],
  },
  'pdf-to-powerpoint': {
    title: 'How to convert PDF to PowerPoint',
    intro: 'PDF to PowerPoint turns a PDF into editable slides: headings become slide titles, paragraphs become bullets, and long pages continue onto extra slides.',
    steps: [
      'Choose one or more PDFs',
      'Click Convert to PowerPoint',
      'Download the .pptx and fine-tune the slides in PowerPoint, Keynote or Google Slides',
    ],
  },
  'pdf-to-excel': {
    title: 'How to convert PDF to Excel',
    intro: 'PDF to Excel exports a PDF\'s text to an .xlsx workbook: a summary sheet, then one sheet per page with one line of text per row. It does not rebuild table columns.',
    steps: [
      'Choose one or more PDFs',
      'Click Convert to Excel',
      'Download the .xlsx, then use Text to Columns in Excel to split rows into cells',
    ],
  },
  'pdf-to-pdfa': {
    title: 'How to convert PDF to PDF/A',
    intro: 'PDF to PDF/A copies your pages into a new document and adds PDF/A identification metadata for archiving. If an archive must certify strict conformance, check the result with a validator such as veraPDF.',
    steps: [
      'Choose one or more PDFs',
      'Click Convert to PDF/A',
      'Download the archival copy',
    ],
  },
  'pdf-to-markdown': {
    title: 'How to convert PDF to Markdown',
    intro: 'PDF to Markdown extracts a PDF\'s text as a .md file — clean input for notes apps, documentation and AI tools.',
    steps: [
      'Choose one or more PDFs',
      'Click Convert to Markdown',
      'Preview and copy the text on the page, or download the .md file',
    ],
  },
  'edit-pdf': {
    title: 'How to edit text in a PDF',
    intro: 'Edit PDF lets you change the existing words, headings and numbers on a page: click a line and type, just like a word processor.',
    steps: [
      'Choose your PDF',
      'Click any line of text on the page',
      'Type your changes',
      'Click Save edited PDF to download it',
    ],
  },
  'rotate-pdf': {
    title: 'How to rotate a PDF and save it',
    intro: 'Rotate PDF turns pages by 90°, 180° or 270° and saves the rotation into the file, so it stays fixed in every viewer.',
    steps: [
      'Choose one or more PDFs',
      'Pick the angle: 90°, 180° or 270°',
      'Apply it to all pages, or type specific pages',
      'Click Rotate PDF and download the result',
    ],
  },
  'add-page-numbers': {
    title: 'How to add page numbers to a PDF',
    intro: 'Add Page Numbers stamps numbers onto every page in one of six positions, in the style you choose.',
    steps: [
      'Choose one or more PDFs',
      'Pick the position — top or bottom, left, center or right',
      'Pick the format: "1", "Page 1" or "1 of N", and the starting number',
      'Click Add Page Numbers and download the result',
    ],
  },
  'add-watermark': {
    title: 'How to add a watermark to a PDF',
    intro: 'Add Watermark stamps a text watermark, such as CONFIDENTIAL or DRAFT, across your pages, with the opacity and size you set.',
    steps: [
      'Choose one or more PDFs',
      'Type your watermark text',
      'Set the opacity and font size',
      'Click Add Watermark and download the result',
    ],
  },
  'crop-pdf': {
    title: 'How to crop a PDF',
    intro: 'Crop PDF trims the same margin from the top, bottom, left and right of every page — ideal for cutting away white space or scanner borders.',
    steps: [
      'Choose one or more PDFs',
      'Set how many points to trim from each edge',
      'Click Crop PDF',
      'Download the cropped file',
    ],
  },
  'sign-pdf': {
    title: 'How to sign a PDF',
    intro: 'Sign PDF places your signature on any page. Draw it, type it in a handwriting font, or upload an image of your real signature.',
    steps: [
      'Choose the PDF you need to sign',
      'Create your signature: draw it, type it, or upload an image',
      'Pick the page and click where the signature should go, then adjust its size',
      'Click Sign & Download PDF',
    ],
    benefits: [PRIVATE, FREE, 'Your signature image is never stored on a server'],
  },
  'redact-pdf': {
    title: 'How to redact a PDF',
    intro: 'Redact PDF permanently blacks out what you mark. Each marked page is rebuilt as an image, so the hidden text is gone from the file — not just covered by a box.',
    steps: [
      'Choose your PDF',
      'Draw boxes over the text or images to hide, or select whole pages',
      'Click Redact',
      'Download the redacted PDF and check it before sharing',
    ],
    benefits: [PRIVATE, FREE, 'True redaction: the hidden content cannot be copied back out'],
  },
  'unlock-pdf': {
    title: 'How to remove a password from a PDF',
    intro: 'Unlock PDF saves a copy of a protected PDF without its password or restrictions. You need the right to unlock the file, and the password if it asks for one to open.',
    steps: [
      'Choose the protected PDF',
      'Enter the password if the file needs one to open',
      'Click Unlock PDF to download an unlocked copy',
    ],
  },
  'protect-pdf': {
    title: 'How to password protect a PDF',
    intro: 'Protect PDF encrypts a PDF so it needs a password to open, with an optional separate owner password, and can block printing, copying or editing.',
    steps: [
      'Choose your PDF',
      'Enter the open password, and optionally a different owner password',
      'Optionally open the permission settings to restrict printing, copying and editing',
      'Click Protect PDF to download the encrypted file',
    ],
    benefits: [PRIVATE, FREE, 'Your password never leaves your device'],
  },
  'compare-pdf': {
    title: 'How to compare two PDFs',
    intro: 'Compare PDF checks an original against a changed version and tells you whether they match, how similar they are, and which pages differ.',
    steps: [
      'Choose two PDFs: the original first, then the changed version',
      'Click Compare PDFs',
      'Read the result: similarity, the list of differing pages, and each file\'s details',
    ],
  },
  'ai-summarizer': {
    title: 'How to summarize a PDF',
    intro: 'Summarizer picks out the most important sentences of a PDF and lists its key points and top topics. It works entirely on your device — no AI service sees your document.',
    steps: [
      'Choose your PDF',
      'Click Generate Summary',
      'Read the key points and topics, and copy them if you need them elsewhere',
    ],
  },
  'translate-pdf': {
    title: 'How to translate a PDF',
    intro: 'Translate PDF translates the text of a PDF into one of 42 languages and gives you the translation on screen or as a new text-only PDF. Unlike our other tools, it sends the text to a free online translation service — the page tells you before you start.',
    steps: [
      'Choose a PDF with real text (run OCR PDF first on scans)',
      'Pick the source language, or leave it on Auto-detect, and the target language',
      'Click Translate',
      'Copy the translation, or download it as a PDF',
    ],
    benefits: [
      FREE,
      'Upfront about privacy: this is the one tool that sends text online, and it says so',
      'Works in any modern browser on Windows, Mac, Linux, iPhone and Android',
    ],
  },
};

export function getToolHowTo(slug: string): ToolHowTo {
  const tool = getToolBySlug(slug);
  const entry = howTos[slug];
  const name = tool?.name ?? 'this tool';
  return {
    title: entry?.title ?? `How to use ${name}`,
    intro: entry?.intro ?? `${tool?.description ?? name}. It runs entirely in your browser.`,
    steps: entry?.steps ?? [
      'Drop your file into the box above, or click to choose it',
      'Adjust the settings if the tool offers any',
      'Run the tool and download the result',
    ],
    benefits: entry?.benefits ?? [PRIVATE, FREE, 'Works in any modern browser on Windows, Mac, Linux, iPhone and Android'],
  };
}
