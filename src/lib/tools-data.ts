export interface ToolInfo {
  slug: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  accept?: string;
  color: string;
  /** Shown above everything else — the one tool that does the lot. */
  featured?: boolean;
}

export const tools: ToolInfo[] = [
  // The everything tool
  {
    slug: 'pdf-workspace',
    name: 'PDF Workspace',
    description: 'Edit, redact, sign, stamp and secure one document without leaving the page',
    icon: 'LayoutGrid',
    category: 'All-in-one',
    color: '#4f46e5',
    featured: true,
  },

  // Organize
  { slug: 'merge-pdf', name: 'Merge PDF', description: 'Combine multiple PDFs into a single file', icon: 'Combine', category: 'Organize PDF', color: '#6366f1' },
  { slug: 'split-pdf', name: 'Split PDF', description: 'Separate a PDF into individual pages', icon: 'Scissors', category: 'Organize PDF', color: '#8b5cf6' },
  { slug: 'remove-pages', name: 'Remove Pages', description: 'Delete specific pages from a PDF', icon: 'Trash2', category: 'Organize PDF', color: '#ef4444' },
  { slug: 'extract-pages', name: 'Extract Pages', description: 'Extract specific pages as a new PDF', icon: 'FileOutput', category: 'Organize PDF', color: '#f59e0b' },
  { slug: 'organize-pdf', name: 'Organize PDF', description: 'Reorder pages and drop the ones you do not need', icon: 'ArrowUpDown', category: 'Organize PDF', color: '#10b981' },

  // Optimize
  { slug: 'compress-pdf', name: 'Compress PDF', description: 'Shrink a PDF to the file size you need', icon: 'Minimize2', category: 'Optimize PDF', color: '#06b6d4' },
  { slug: 'optimize-pdf', name: 'Optimize PDF', description: 'Repack a PDF losslessly to trim its size', icon: 'Zap', category: 'Optimize PDF', color: '#0ea5e9' },
  { slug: 'repair-pdf', name: 'Repair PDF', description: 'Fix corrupted or damaged PDF files', icon: 'Wrench', category: 'Optimize PDF', color: '#14b8a6' },
  { slug: 'ocr-pdf', name: 'OCR PDF', description: 'Extract text from scanned documents', icon: 'ScanText', category: 'Optimize PDF', color: '#84cc16' },

  // Convert to PDF
  { slug: 'jpg-to-pdf', name: 'JPG to PDF', description: 'Convert images to PDF documents', icon: 'Image', category: 'Create PDF', color: '#f97316' },
  { slug: 'scan-pdf', name: 'Scan PDF', description: 'Scan documents with your camera and save as PDF', icon: 'Camera', category: 'Create PDF', color: '#7c3aed' },
  { slug: 'word-to-pdf', name: 'Word to PDF', description: 'Turn a document (DOCX) into a PDF', icon: 'FileText', category: 'Create PDF', color: '#2563eb' },
  { slug: 'powerpoint-to-pdf', name: 'PowerPoint to PDF', description: 'Turn slides (PPTX) into a PDF', icon: 'Presentation', category: 'Create PDF', color: '#dc2626' },
  { slug: 'excel-to-pdf', name: 'Excel to PDF', description: 'Turn a spreadsheet (XLSX) into a PDF', icon: 'Table', category: 'Create PDF', color: '#16a34a' },
  { slug: 'html-to-pdf', name: 'HTML to PDF', description: 'Convert HTML code or .html files to PDF', icon: 'Globe', category: 'Create PDF', color: '#7c3aed' },
  { slug: 'heic-to-pdf', name: 'HEIC to PDF', description: 'Convert Apple HEIC images to PDF', icon: 'Smartphone', category: 'Create PDF', color: '#8b5cf6' },
  { slug: 'webp-to-pdf', name: 'WebP to PDF', description: 'Convert WebP images to PDF documents', icon: 'FileImage', category: 'Create PDF', color: '#0ea5e9' },
  { slug: 'tiff-to-pdf', name: 'TIFF to PDF', description: 'Convert TIFF images to PDF documents', icon: 'Layers', category: 'Create PDF', color: '#d946ef' },
  { slug: 'svg-to-pdf', name: 'SVG to PDF', description: 'Convert SVG vector images to PDF', icon: 'FileCode', category: 'Create PDF', color: '#14b8a6' },
  { slug: 'epub-to-pdf', name: 'EPUB to PDF', description: 'Convert EPUB ebooks to PDF documents', icon: 'BookOpen', category: 'Create PDF', color: '#f97316' },

  // Convert from PDF
  { slug: 'pdf-to-jpg', name: 'PDF to JPG', description: 'Convert PDF pages to JPG images', icon: 'FileImage', category: 'Export PDF', color: '#eab308' },
  { slug: 'pdf-to-word', name: 'PDF to Word', description: 'Turn a PDF into an editable document (DOCX)', icon: 'FileType', category: 'Export PDF', color: '#0891b2' },
  { slug: 'pdf-to-powerpoint', name: 'PDF to PowerPoint', description: 'Turn a PDF into editable slides (PPTX)', icon: 'Slideshow', category: 'Export PDF', color: '#ea580c' },
  { slug: 'pdf-to-excel', name: 'PDF to Excel', description: 'Export PDF text to a spreadsheet, one line per row (XLSX)', icon: 'Grid3x3', category: 'Export PDF', color: '#0d9488' },
  { slug: 'pdf-to-pdfa', name: 'PDF to PDF/A', description: 'Convert PDF to archival PDF/A format', icon: 'Archive', category: 'Export PDF', color: '#64748b' },
  { slug: 'pdf-to-markdown', name: 'PDF to Markdown', description: 'Convert PDF content to Markdown text', icon: 'FileCode', category: 'Export PDF', color: '#0f766e' },

  // Edit
  { slug: 'edit-pdf', name: 'Edit PDF', description: 'Change the text, headings and numbers in a PDF', icon: 'TextCursorInput', category: 'Modify PDF', color: '#7c3aed' },
  { slug: 'rotate-pdf', name: 'Rotate PDF', description: 'Rotate PDF pages by 90°, 180° or 270°', icon: 'RotateCw', category: 'Modify PDF', color: '#a855f7' },
  { slug: 'add-page-numbers', name: 'Add Page Numbers', description: 'Insert page numbers into your PDF', icon: 'Hash', category: 'Modify PDF', color: '#3b82f6' },
  { slug: 'add-watermark', name: 'Add Watermark', description: 'Stamp a text watermark on every page', icon: 'Droplets', category: 'Modify PDF', color: '#0891b2' },
  { slug: 'crop-pdf', name: 'Crop PDF', description: 'Crop and resize PDF pages', icon: 'Crop', category: 'Modify PDF', color: '#65a30d' },
  { slug: 'sign-pdf', name: 'Sign PDF', description: 'Place your drawn, typed or uploaded signature on a PDF', icon: 'PenTool', category: 'Modify PDF', color: '#1d4ed8' },
  { slug: 'redact-pdf', name: 'Redact PDF', description: 'Black out text, images or pages permanently', icon: 'Eraser', category: 'Modify PDF', color: '#991b1b' },

  // Security
  { slug: 'unlock-pdf', name: 'Unlock PDF', description: 'Remove password protection from PDF', icon: 'Unlock', category: 'PDF Security', color: '#16a34a' },
  { slug: 'protect-pdf', name: 'Protect PDF', description: 'Add password protection to PDF', icon: 'Lock', category: 'PDF Security', color: '#dc2626' },

  // AI
  { slug: 'compare-pdf', name: 'Compare PDF', description: 'Compare two PDF files for differences', icon: 'GitCompare', category: 'PDF Intelligence', color: '#7c3aed' },
  { slug: 'ai-summarizer', name: 'Summarizer', description: 'Summarize PDF content', icon: 'Sparkles', category: 'PDF Intelligence', color: '#ec4899' },
  { slug: 'translate-pdf', name: 'Translate PDF', description: 'Translate PDF text into 42 languages', icon: 'Languages', category: 'PDF Intelligence', color: '#0ea5e9' },
];

export const categories = [
  'All-in-one',
  'Organize PDF',
  'Optimize PDF',
  'Create PDF',
  'Export PDF',
  'Modify PDF',
  'PDF Security',
  'PDF Intelligence',
];

/** One-line summary of each category, shown on the /tools hub. */
export const categoryBlurbs: Record<string, string> = {
  'All-in-one': 'Do several jobs on one document without downloading in between.',
  'Organize PDF': 'Combine, split, reorder and trim the pages of your PDFs.',
  'Optimize PDF': 'Make PDFs smaller, faster to open, searchable, or readable again.',
  'Create PDF': 'Turn images, Office files, web pages and ebooks into PDF.',
  'Export PDF': 'Get your content out of a PDF as Word, Excel, slides, images or text.',
  'Modify PDF': 'Edit text, sign, number, watermark, crop, rotate and redact.',
  'PDF Security': 'Add or remove password protection.',
  'PDF Intelligence': 'Compare, summarize and translate what a PDF says.',
};

/** URL fragment for a category, e.g. "Organize PDF" → "organize-pdf". */
export function categoryAnchor(category: string): string {
  return category.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/**
 * What people usually do next after each tool. Drives the "next step" links
 * on tool pages, so link equity follows real workflows instead of whatever
 * happens to share a category.
 */
const nextSteps: Record<string, string[]> = {
  'pdf-workspace': ['edit-pdf', 'sign-pdf', 'redact-pdf', 'protect-pdf'],
  'merge-pdf': ['compress-pdf', 'organize-pdf', 'add-page-numbers', 'split-pdf'],
  'split-pdf': ['extract-pages', 'remove-pages', 'merge-pdf', 'organize-pdf'],
  'remove-pages': ['organize-pdf', 'extract-pages', 'merge-pdf', 'compress-pdf'],
  'extract-pages': ['split-pdf', 'merge-pdf', 'remove-pages', 'pdf-to-jpg'],
  'organize-pdf': ['rotate-pdf', 'remove-pages', 'merge-pdf', 'add-page-numbers'],
  'compress-pdf': ['optimize-pdf', 'merge-pdf', 'protect-pdf', 'pdf-to-pdfa'],
  'optimize-pdf': ['compress-pdf', 'repair-pdf', 'pdf-to-pdfa', 'ocr-pdf'],
  'repair-pdf': ['compress-pdf', 'unlock-pdf', 'pdf-to-pdfa', 'merge-pdf'],
  'ocr-pdf': ['scan-pdf', 'pdf-to-word', 'compress-pdf', 'pdf-to-excel'],
  'jpg-to-pdf': ['merge-pdf', 'compress-pdf', 'scan-pdf', 'heic-to-pdf'],
  'scan-pdf': ['ocr-pdf', 'compress-pdf', 'sign-pdf', 'merge-pdf'],
  'word-to-pdf': ['merge-pdf', 'compress-pdf', 'protect-pdf', 'sign-pdf'],
  'powerpoint-to-pdf': ['compress-pdf', 'merge-pdf', 'add-watermark', 'pdf-to-powerpoint'],
  'excel-to-pdf': ['merge-pdf', 'compress-pdf', 'pdf-to-excel', 'protect-pdf'],
  'html-to-pdf': ['merge-pdf', 'compress-pdf', 'add-page-numbers', 'pdf-to-word'],
  'heic-to-pdf': ['jpg-to-pdf', 'merge-pdf', 'compress-pdf', 'webp-to-pdf'],
  'webp-to-pdf': ['jpg-to-pdf', 'merge-pdf', 'compress-pdf', 'svg-to-pdf'],
  'tiff-to-pdf': ['ocr-pdf', 'merge-pdf', 'compress-pdf', 'jpg-to-pdf'],
  'svg-to-pdf': ['merge-pdf', 'webp-to-pdf', 'jpg-to-pdf', 'compress-pdf'],
  'epub-to-pdf': ['compress-pdf', 'split-pdf', 'pdf-to-word', 'add-page-numbers'],
  'pdf-to-jpg': ['jpg-to-pdf', 'extract-pages', 'compress-pdf', 'pdf-to-powerpoint'],
  'pdf-to-word': ['ocr-pdf', 'edit-pdf', 'word-to-pdf', 'pdf-to-excel'],
  'pdf-to-powerpoint': ['powerpoint-to-pdf', 'pdf-to-jpg', 'pdf-to-word', 'compress-pdf'],
  'pdf-to-excel': ['excel-to-pdf', 'ocr-pdf', 'pdf-to-word', 'pdf-to-markdown'],
  'pdf-to-pdfa': ['compress-pdf', 'repair-pdf', 'ocr-pdf', 'protect-pdf'],
  'pdf-to-markdown': ['pdf-to-word', 'ocr-pdf', 'ai-summarizer', 'pdf-to-excel'],
  'edit-pdf': ['sign-pdf', 'redact-pdf', 'add-watermark', 'pdf-workspace'],
  'rotate-pdf': ['organize-pdf', 'crop-pdf', 'merge-pdf', 'compress-pdf'],
  'add-page-numbers': ['merge-pdf', 'add-watermark', 'organize-pdf', 'protect-pdf'],
  'add-watermark': ['protect-pdf', 'add-page-numbers', 'sign-pdf', 'redact-pdf'],
  'crop-pdf': ['rotate-pdf', 'organize-pdf', 'compress-pdf', 'pdf-to-jpg'],
  'sign-pdf': ['protect-pdf', 'merge-pdf', 'edit-pdf', 'compress-pdf'],
  'redact-pdf': ['protect-pdf', 'compress-pdf', 'edit-pdf', 'add-watermark'],
  'unlock-pdf': ['edit-pdf', 'merge-pdf', 'compress-pdf', 'protect-pdf'],
  'protect-pdf': ['add-watermark', 'redact-pdf', 'unlock-pdf', 'sign-pdf'],
  'compare-pdf': ['edit-pdf', 'ai-summarizer', 'pdf-to-word', 'merge-pdf'],
  'ai-summarizer': ['translate-pdf', 'pdf-to-markdown', 'compare-pdf', 'ocr-pdf'],
  'translate-pdf': ['ai-summarizer', 'pdf-to-word', 'ocr-pdf', 'pdf-to-markdown'],
};

/** Tools to suggest after `slug`: curated next steps, topped up from its category. */
export function getNextTools(slug: string, count = 4): ToolInfo[] {
  const tool = getToolBySlug(slug);
  if (!tool) return [];
  const out: ToolInfo[] = [];
  const add = (t?: ToolInfo) => {
    if (t && t.slug !== slug && !out.includes(t) && out.length < count) out.push(t);
  };
  for (const s of nextSteps[slug] ?? []) add(getToolBySlug(s));
  for (const t of getToolsByCategory(tool.category)) add(t);
  return out;
}

export function getToolsByCategory(category: string): ToolInfo[] {
  return tools.filter(t => t.category === category);
}

export function getToolBySlug(slug: string): ToolInfo | undefined {
  return tools.find(t => t.slug === slug);
}

export const featuredTool = tools.find(t => t.featured)!;
