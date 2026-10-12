/**
 * English source for the page chrome of translated pages: navigation,
 * homepage, tools hub and tool-page section headings. Exported into
 * content/en.json by scripts/export-en-content.mjs. {name} marks a value
 * filled in at render time and must be kept in every translation.
 */
export const site = {
  homeTitle: 'Free PDF Tools That Run in Your Browser',
  homeDescription: 'Merge, split, compress, convert, sign and edit PDFs right in your browser. Free, no sign-up, and your files are never uploaded.',
  heroBadge: 'Files never leave your device',
  heroTitle: 'Every PDF tool you need,',
  heroHighlight: 'free and private.',
  heroSubtitle: 'Merge, split, compress, convert, edit and sign documents in your browser. No uploads, no sign-up and no watermarks.',
  heroCta: 'See all PDF tools',
  popularTools: 'Popular tools',
  whyTitle: 'Why {site}?',
  why: [
    { title: 'Your files stay private', text: 'Everything happens on your device. Your documents are never uploaded to a server — ideal for confidential work.' },
    { title: 'Instant results', text: 'No uploads and no queues. Your PDF is processed the moment you click, even on a slow connection.' },
    { title: 'Free, with no watermark', text: 'Use every tool as often as you like. No account, no watermark on your files and no hidden fees.' },
  ],
  faqTitle: 'Frequently asked questions',
  homeFaqs: [
    { q: 'Is {site} really free?', a: 'Yes. Every tool is free to use, with no account, no watermark on your files and no paid tier.' },
    { q: 'Are my files uploaded to a server?', a: 'No. The tools run in your browser, so your files stay on your device. The only exception is Translate PDF, which sends the text to a translation service and tells you before it does.' },
    { q: 'Do I need to install anything?', a: 'No. It works in any modern browser — Chrome, Edge, Firefox or Safari — on Windows, Mac, Linux, Android and iPhone.' },
    { q: 'Do I need to create an account?', a: 'No. Open a tool and start working right away.' },
  ],
  hubTitle: 'All PDF Tools — {count} Free Tools, No Upload',
  hubDescription: 'Every {site} tool in one place: merge, split, compress, convert, edit, sign and protect PDFs. Free, no account, and your files never leave your browser.',
  hubH1: 'Every PDF tool you need, in one place',
  hubIntro: '{count} free PDF tools to merge, split, compress, convert, edit, sign and protect your documents. Each one runs in your browser, so your files are never uploaded — no account, no watermark.',
  navWorkspace: 'Workspace',
  navAllTools: 'All tools',
  navGuides: 'Guides (English)',
  language: 'Language',
  footerTagline: 'Free PDF tools that run in your browser. Edit, convert, merge and compress PDFs without uploading them.',
  footerPrivate: '100% private. Files never leave your device.',
  footerAllTools: 'All {count} PDF tools',
  footerNoSignup: 'No sign-up',
  footerNoWatermark: 'No watermarks',
  footerAbout: 'About (English)',
  footerPrivacy: 'Privacy (English)',
  footerTerms: 'Terms (English)',
  breadcrumbHome: 'Home',
  breadcrumbTools: 'PDF Tools',
  whyToolHeading: 'Why use {tool} here?',
  faqHeading: '{tool} — frequently asked questions',
  continueHeading: 'Continue with another tool',
  seeAllTools: 'See all {count} PDF tools',
};

export type SiteStrings = typeof site;
