import type { BlogPost } from '../types';

export const newPosts25: BlogPost[] = [
  {
    slug: 'how-to-add-an-image-to-a-pdf',
    title: 'Add an Image to a PDF and Drag It Anywhere',
    description: 'Add an image to a PDF free — insert a photo, logo or picture, then drag it anywhere on the page and resize it. In your browser, nothing uploaded.',
    keyword: 'add image to pdf',
    category: 'Editing & Signing',
    published: '2026-09-30',
    tool: 'edit-pdf',
    blocks: [
      { type: 'p', text: 'The request arrives in a few guises — "add image to pdf", "insert picture into pdf", "put a photo on a pdf", the German "bild in pdf einfügen" or the Spanish "agregar imagen a pdf". All of them mean the same useful thing: place a picture on a page of a PDF and be able to move it where it belongs. The Edit PDF tool does exactly that in the browser, with nothing uploaded.' },
      { type: 'h2', text: 'Why add a picture to a PDF' },
      { type: 'list', items: [
        'A company logo or stamp on a letter, invoice or quote before it is sent.',
        'A screenshot dropped into a report to illustrate a step or an error.',
        'A photo added to an application form that expects images inline.',
        'A hand-drawn signature or mark saved as an image and placed where it signs the page.',
      ] },
      { type: 'h2', text: 'Add an image to your PDF, step by step' },
      { type: 'steps', items: [
        'Open the Edit PDF tool and add your PDF document.',
        'Click Add image and choose a PNG or a JPEG picture from your files.',
        'The picture appears on the current page, centred and ready to move.',
        'Drag it anywhere you want it, drag the corner handle to resize it, then download the finished PDF.', ],
      },
      { type: 'callout', title: 'PNG for sharp edges, JPEG for photos', text: 'PNG keeps crisp edges, which suits logos, stamps and text in a picture. JPEG is the everyday format for photographs. Both work; the choice is about how clean the edges need to be.' },
      { type: 'h2', text: 'Move and resize it freely' },
      { type: 'p', text: 'Placing is not final. The image stays live until you download: drag it to any position on the page, pull the corner handle to grow or shrink it, and use the arrow keys for a pixel-precise nudge. Alignment guides appear while you drag, so lines up against the page edge or against neighbouring text line up neatly instead of by eye.' },
      { type: 'h2', text: 'The image, replaced or removed, anytime' },
      { type: 'p', text: 'Select the picture and the bar offers Replace, to swap in a different photo or logo at the same spot, and Remove, to drop it back off the page. A wrong picture is a two-second fix, not a redo of the document.' },
      { type: 'h2', text: 'Pictures and text on the same page' },
      { type: 'p', text: 'The editor stacks its capabilities: click any line of the document to edit that text, click Add text to write new lines, and add or move images on the same page. A letter that needs a logo, body copy and a signature line can be finished in one pass and downloaded as one PDF.' },
      { type: 'h2', text: 'Free, private and everywhere' },
      { type: 'p', text: 'Everything runs in your browser, so the PDF and the picture never leave your device. It is free, requires no account, and works from Windows, Mac, iPhone and Android — the German "bild in pdf einfügen" search reaches the same tool as the English one.' },
    ],
    faqs: [
      { q: 'Can I move a picture anywhere on the PDF page?', a: 'Yes. After adding the image it is live: drag it to any position on the page, and alignment guides help it sit neatly against the edges or next to text.' },
      { q: 'How do I resize the image I added?', a: 'Select the picture and drag the corner handle to grow or shrink it, or use the arrow keys for fine positioning. The size you leave it at is the size that downloads.' },
      { q: 'Which image files can I add?', a: 'PNG and JPEG pictures are accepted. PNG suits logos, stamps and graphics with sharp edges; JPEG suits photographs.' },
      { q: 'Will the image stay sharp in the finished PDF?', a: 'Yes — the picture is embedded as it is, without re-compression, so its quality is preserved in the file you download.' },
      { q: 'Can I swap the picture after placing it?', a: 'Select the image and choose Replace to drop in a different PNG or JPEG in the same position and size, without redoing the rest of the page.' },
      { q: 'What does "bild in pdf einfügen" mean?', a: 'It is the German phrase for adding an image to a PDF — the same operation as "add image to pdf". The tool is language-neutral and handles documents in any language identically.' },
    ],
    related: ['how-to-edit-a-pdf-without-adobe', 'how-to-add-text-to-a-pdf', 'how-to-add-a-seal-or-stamp-image-to-a-pdf', 'how-to-add-initials-to-a-pdf'],
  },
];