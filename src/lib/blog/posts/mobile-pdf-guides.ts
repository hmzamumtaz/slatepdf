import type { BlogPost } from '../types';

export const mobilePdfGuidesPosts: BlogPost[] = [

  // Article 5: How to Convert Word to PDF on iPhone
  {
    slug: 'how-to-convert-word-to-pdf-on-iphone',
    title: 'How to Convert Word to PDF on iPhone (Free, No App)',
    description: 'Convert Word to PDF on iPhone for free — with the Files app’s hidden print-to-PDF, Apple’s Pages, or a Safari tool that keeps the file on your phone.',
    keyword: 'how to convert word to pdf on iphone',
    category: 'Converting',
    published: '2026-08-31',
    updated: '2026-10-13',
    tool: 'word-to-pdf',
    blocks: [
      { type: 'p', text: 'You wrote a document — a résumé, a report, a final essay — and now you need to send it as a PDF because PDFs open with the layout intact on any device. On an iPhone you have several quick, free ways to convert a Word document to PDF, and the first one needs no app at all.' },
      { type: 'h2', text: 'How do I convert a Word document to PDF on my iPhone?' },
      { type: 'p', text: 'To convert Word to PDF on an iPhone without an app, open the .docx in the Files app, tap Share, choose Print, then tap the Share button on the Print Options screen and Save to Files. The saved copy is a PDF. Apple’s free Pages app or a browser converter in Safari also work.' },
      { type: 'steps', items: [
        'Open the Files app and tap the .docx to preview it.',
        'Tap the Share button and choose Print.',
        'On the Print Options screen, tap the Share button at the top.',
        'Choose Save to Files, pick a folder and tap Save.',
      ] },
      { type: 'h2', text: 'Method 1: the Files app print trick (no app)' },
      { type: 'p', text: 'Every iPhone can turn anything printable into a PDF through the print screen, even with no printer. The PDF matches the Files preview, which renders most Word documents faithfully. On older iOS versions the Share button may not appear on the print screen; instead, pinch outward on the page thumbnail to open a full-screen PDF preview, then tap Share and Save to Files.' },
      { type: 'h2', text: 'Method 2: Apple’s Pages app' },
      { type: 'p', text: 'Pages is Apple’s free word processor; it is preinstalled on many iPhones and free from the App Store if not. It opens .docx files and exports them as PDF:' },
      { type: 'steps', items: [
        'Open the .docx in Pages, or from the Files app choose Share → Pages.',
        'Tap the More button (⋯), then Export.',
        'Choose PDF.',
        'Save the PDF to Files, or share it by email or message.',
      ] },
      { type: 'p', text: 'Pages preserves headings, images and most formatting well. Fonts it does not have are replaced, so a document set in an unusual typeface may shift slightly — check the first page.' },
      { type: 'h2', text: 'Method 3: Safari, with no upload' },
      { type: 'p', text: 'If you would rather not install anything, [Word to PDF](/tools/word-to-pdf) converts the file in Safari on the iPhone itself. The document is processed on the phone, not uploaded, and no account is needed:' },
      { type: 'steps', items: [
        'Open the Word to PDF tool in Safari.',
        'Tap to choose a file and select the .docx from the Files app or iCloud Drive.',
        'Tap Convert to PDF.',
        'Download the PDF; it appears in the Downloads folder in Files.',
      ] },
      { type: 'callout', title: 'Know what the browser converter changes', text: 'It keeps your text, headings, lists, tables and images, but it re-typesets them onto A4 pages in standard fonts rather than reproducing Word’s exact layout, and headers, footers and page numbers are not carried over. It reads .docx only. For a letter or an essay that is fine; for a designed CV, use Pages or the print trick.' },
      { type: 'h2', text: 'Which method should you use?' },
      { type: 'table', head: ['Method', 'Needs an app', 'Keeps layout', 'Best for'], rows: [
        ['Files app print trick', 'No', 'As the preview shows it', 'Quick conversions of most documents'],
        ['Pages', 'Pages (free)', 'Closely, with font substitution', 'Documents you also want to edit'],
        ['Safari converter', 'No', 'Content kept, layout simplified', 'Text-heavy, sensitive documents'],
      ] },
      { type: 'h2', text: 'Converting an email attachment' },
      { type: 'p', text: 'A document that arrives in Mail or Messages can be converted the same way: long-press or tap the attachment, choose Save to Files, then use any of the methods above. In Mail you can also open the attachment preview and use Share → Print directly.' },
      { type: 'h2', text: 'What goes wrong, and the fix' },
      { type: 'list', items: [
        'No Share button on the print screen → pinch outward on the page thumbnail first (older iOS).',
        'The preview shows a blank or garbled page → the file may be an old .doc or password-protected; open it in Pages instead.',
        'A table or image is cut off → open the document in Pages, set the page to landscape or narrow the table, and export again.',
        'You cannot find the PDF → check Recents and the Downloads folder in the Files app.',
      ] },
      { type: 'callout', title: 'Look at the last page before sending', text: 'The page most likely to be wrong is the last one: a stray blank page, a signature line pushed onto its own sheet. I scroll to the end of every converted PDF before attaching it. It is the quickest check there is.' },
      { type: 'h2', text: 'Other file types on iPhone' },
      { type: 'p', text: 'The same print trick works for anything you can preview, and there are dedicated browser converters for Excel and PowerPoint files. For every way of creating a PDF on the phone — photos, web pages, scans — see [how to make a PDF on iPhone](/blog/how-to-make-a-pdf-on-iphone). On Android? Follow [the Android guide](/blog/how-to-convert-word-to-pdf-on-android) instead.' },
    ],
    faqs: [
      { q: 'Can I convert a Word document to PDF on my iPhone for free?', a: 'Yes. The Files app can print a .docx to PDF, Apple’s free Pages app exports to PDF, and a browser converter in Safari handles it too — none of them cost anything.' },
      { q: 'Does the iPhone have a built-in Word to PDF converter?', a: 'Not as a button, but the print screen can save any previewable document as a PDF through Share → Save to Files.' },
      { q: 'Can I convert a Word file that arrived as an email attachment?', a: 'Yes. Save the attachment to the Files app first, then use the print trick, Pages or a browser converter.' },
      { q: 'Is my Word document uploaded when I convert it?', a: 'Not with the print trick, Pages or an on-device browser converter. Cloud services such as Google Docs keep a copy in your account.' },
      { q: 'Why does my PDF look different from the Word file?', a: 'Usually a font the iPhone does not have, which gets replaced. Choose a common font in the original, or convert on a computer with Word installed.' },
    ],
    related: ['how-to-convert-word-to-pdf-without-losing-formatting', 'how-to-convert-word-to-pdf-on-android', 'how-to-make-a-pdf-on-iphone', 'how-to-convert-a-word-document-to-pdf-online'],
  },
];
