import type { BlogPost } from '../types';

export const mobilePdfGuidesPosts: BlogPost[] = [

  // Article 5: How to Convert Word to PDF on iPhone
  {
    slug: 'how-to-convert-word-to-pdf-on-iphone',
    title: 'How to Convert Word to PDF on iPhone (Free, No App)',
    description: 'Turn a Word document into a PDF on your iPhone for free. Convert in your browser or with the Pages app, no install needed.',
    keyword: 'how to convert word to pdf on iphone',
    category: 'Converting',
    published: '2026-08-31',
    tool: 'word-to-pdf',
    blocks: [
      { type: 'p', text: 'You wrote a document, maybe a resume, a report, or a final essay, and now you need to send it as a PDF because PDFs open with the layout intact on any device. On an iPhone you have a couple of quick, free ways to convert a Word document to PDF without installing a new app.' },
      { type: 'p', text: 'Here is how to convert Word to PDF on an iPhone for free.' },
      { type: 'h2', text: 'Convert a Word document in the Pages app' },
      { type: 'p', text: 'If the document is a .docx file, the free Pages app that comes with your iPhone can open and export it as a PDF:' },
      { type: 'steps', items: [
        'Open the Pages app on your iPhone, or open the .docx file from the Files app.',
        'Tap Export in the Share menu once the document is open.',
        'Choose PDF as the export format.',
        'Save the PDF to the Files app or share it directly by email or message.',
      ] },
      { type: 'p', text: 'Pages preserves headings, images, and formatting well, making it a dependable choice for documents you already have on your iPhone.' },
      { type: 'h2', text: 'Convert Word to PDF in Safari (any .docx)' },
      { type: 'p', text: 'If you would rather not open Pages, a browser-based converter converts many Word documents to PDF in one step. It runs in Safari, needs no app download, and processes the file locally so your document stays on your phone:' },
      { type: 'steps', items: [
        'Open the Word to PDF tool in Safari on your iPhone.',
        'Tap to choose a file, then select your .docx document from the Files app or iCloud Drive.',
        'Confirm Word as the input format and tap convert.',
        'Download the finished PDF back to your device.',
      ] },
      { type: 'p', text: 'This is especially handy when a document arrives in Mail or Messages and you want to forward it as a PDF — save the attachment to Files, then convert it in your browser.' },
      { type: 'h2', text: 'What about a PDF, Excel, or PowerPoint file?' },
      { type: 'p', text: 'The same approach works for other file types. You can convert a PDF back to Word to edit it, or turn spreadsheets and slide decks into PDF so they open cleanly anywhere. Each format has its own dedicated browser tool, so you can handle them all from your iPhone without installing apps.' },
      { type: 'h2', text: 'Check the layout before you send it' },
      { type: 'p', text: 'After converting, open the PDF once and check that images, tables, and headings landed where you expect. PDF is meant to look identical everywhere, but a quick review catches any surprise before it reaches the recipient.' },
    ],
    faqs: [
      { q: 'Can I convert a Word document to PDF on my iPhone for free?', a: 'Yes. The built-in Pages app exports a .docx as a PDF, and a browser-based converter handles it too — neither needs a new app or an account.' },
      { q: 'Does the iPhone come with a Word to PDF converter?', a: 'The Pages app, included free with iOS, opens Word documents and exports them as PDFs with your layout intact.' },
      { q: 'Can I convert a Word file that arrived as an email attachment?', a: 'Yes. Save the attachment to the Files app first, then open it in Pages or a browser-based converter to turn it into a PDF.' },
      { q: 'Is my Word document uploaded to a server when I convert it?', a: 'No. Pages works entirely on your device, and a browser-based converter processes the file locally so it never leaves your iPhone.' },
      { q: 'Can I convert other file types to PDF on iPhone?', a: 'Yes. Excel and PowerPoint files can also be turned into PDF, so they open with the same layout on any device.' },
    ],
    related: ['how-to-convert-word-to-pdf-without-losing-formatting', 'how-to-convert-pdf-to-word-without-losing-formatting', 'how-to-make-a-pdf-on-iphone', 'how-to-convert-a-web-page-to-pdf'],
  },
];
