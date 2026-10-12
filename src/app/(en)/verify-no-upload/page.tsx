import type { Metadata } from 'next';
import Link from 'next/link';
import Breadcrumbs from '@/components/Breadcrumbs';
import { SITE_NAME, SITE_URL, pageTitle } from '@/lib/site';
import { generateBreadcrumbSchema, generateFAQSchema } from '@/lib/schema';

const TITLE = 'Check That Your PDF Is Never Uploaded (2-Minute Test)';
const DESCRIPTION = `How to prove ${SITE_NAME} processes your PDF on your own device: watch the Network tab while a tool runs, or switch to airplane mode. Every request, listed.`;

export const metadata: Metadata = {
  title: pageTitle(TITLE),
  description: DESCRIPTION,
  alternates: { canonical: '/verify-no-upload' },
  openGraph: { type: 'article', title: TITLE, description: DESCRIPTION, url: '/verify-no-upload', siteName: SITE_NAME, images: [{ url: `${SITE_URL}/og-home.png`, width: 1200, height: 630, alt: SITE_NAME }] },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION, images: [`${SITE_URL}/og-home.png`] },
};

const faqs = [
  {
    q: 'Do online PDF tools upload my files?',
    a: 'Most do: the file is sent to the provider’s server, processed there and deleted later, usually after one to twenty-four hours. Slate PDF works differently — the PDF is read and written by code running in your browser, so the file itself is never sent anywhere.',
  },
  {
    q: 'How can I tell whether a PDF website uploads my file?',
    a: 'Open your browser’s developer tools, go to the Network tab, then run the tool. An upload shows up as a request whose size is roughly the size of your file. Or load the tool, turn on airplane mode, and run it: a tool that needs a server will fail.',
  },
  {
    q: 'Does any Slate PDF tool send data online?',
    a: 'Translate PDF sends the text it extracted to a public translation service, and says so before you start. No other tool sends your document or its contents anywhere.',
  },
  {
    q: 'Is it safe for confidential documents?',
    a: 'Because the file never leaves your device, there is no copy on someone else’s server to leak or retain. Avoid Translate PDF for confidential text, and keep your device itself secure.',
  },
];

const requests: [string, string][] = [
  ['The page itself', 'HTML, scripts, styles and fonts from slatepdf.space — the same for every visitor.'],
  ['Text-recognition model (OCR tools only)', 'OCR PDF and Scan PDF download the recognition engine and a language model (a few MB) once from cdn.jsdelivr.net. This is a download; your file is not sent.'],
  ['Analytics', 'Google Analytics and Vercel record that a page was viewed. They never receive your file or its contents.'],
  ['Star ratings', 'If you rate a tool, your 1–5 score is sent to slatepdf.space/api/rating. Nothing else.'],
  ['Translate PDF (the one exception)', 'The text extracted from your PDF is sent to a public translation service (Lingva, LibreTranslate or MyMemory). The tool warns you before it does.'],
];

export default function VerifyNoUploadPage() {
  const breadcrumb = generateBreadcrumbSchema([
    { name: 'Home', url: SITE_URL },
    { name: 'Verify no upload', url: `${SITE_URL}/verify-no-upload` },
  ]);
  const faqSchema = generateFAQSchema(faqs);

  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      {faqSchema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />}
      <Breadcrumbs items={[{ label: 'Verify no upload' }]} />

      <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground text-balance">
        Check that your PDF is never uploaded
      </h1>
      <p className="mt-4 text-lg text-gray-600 leading-relaxed">
        Every {SITE_NAME} tool except Translate PDF processes your file inside your own browser. You don&rsquo;t have to
        take our word for it: the two tests below take about two minutes and work on any website, so you can compare
        us with any other PDF tool.
      </p>

      <h2 className="mt-10 text-2xl font-bold text-foreground">Does Slate PDF upload your files?</h2>
      <p className="mt-3 text-gray-700 leading-relaxed">
        No. When you merge, compress, convert, sign or edit a PDF here, the file is opened by JavaScript running on your
        device and the result is saved straight back to your device. No copy of the document is sent to a server, so
        there is nothing for us to store, read or delete.
      </p>
      <ul className="mt-3 list-disc ps-6 space-y-1 text-gray-700">
        <li>Your file never leaves your device.</li>
        <li>No account and no server-side storage.</li>
        <li>The one exception: Translate PDF sends the extracted text to a translation service.</li>
      </ul>

      <h2 className="mt-10 text-2xl font-bold text-foreground">Test 1: watch the Network tab</h2>
      <ol className="mt-3 list-decimal ps-6 space-y-2 text-gray-700 leading-relaxed">
        <li>Open a tool, for example <Link href="/tools/merge-pdf" className="text-indigo-600 underline">Merge PDF</Link>, in Chrome, Edge or Firefox.</li>
        <li>Press <kbd className="px-1.5 py-0.5 rounded border border-border bg-gray-50 text-sm">F12</kbd> (or right-click → Inspect) and open the <strong>Network</strong> tab.</li>
        <li>Click the clear button so the list is empty.</li>
        <li>Add your PDF and run the tool, then download the result.</li>
        <li>Look at the list. An upload would appear as a request about as large as your file. You will not find one.</li>
      </ol>

      <h2 className="mt-10 text-2xl font-bold text-foreground">Test 2: airplane mode</h2>
      <ol className="mt-3 list-decimal ps-6 space-y-2 text-gray-700 leading-relaxed">
        <li>Open the tool page and wait for it to finish loading.</li>
        <li>Turn on airplane mode, or unplug from the network.</li>
        <li>Add your PDF and run the tool. It still works, because nothing needs a server.</li>
      </ol>
      <p className="mt-3 text-gray-700 leading-relaxed">
        Run the same test on a tool that uploads files and it fails as soon as it tries to send the document. (OCR tools
        need to download their language model once while online; after that they work offline too.)
      </p>

      <h2 className="mt-10 text-2xl font-bold text-foreground">Every request Slate PDF makes</h2>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr><th className="p-3 font-semibold">What</th><th className="p-3 font-semibold">What is sent</th></tr>
          </thead>
          <tbody className="divide-y divide-border">
            {requests.map(([what, detail]) => (
              <tr key={what}><td className="p-3 font-medium text-foreground align-top">{what}</td><td className="p-3 text-gray-700">{detail}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mt-10 text-2xl font-bold text-foreground">Frequently asked questions</h2>
      <div className="mt-4 divide-y divide-border rounded-2xl border border-border bg-white">
        {faqs.map(f => (
          <details key={f.q} className="group px-5 py-4">
            <summary className="cursor-pointer list-none font-semibold text-foreground flex items-start justify-between gap-4">
              {f.q}
              <span className="text-muted-foreground transition-transform group-open:rotate-45 text-xl leading-none">+</span>
            </summary>
            <p className="mt-2 text-gray-600 leading-relaxed">{f.a}</p>
          </details>
        ))}
      </div>

      <p className="mt-10 text-gray-700">
        Ready to try it? <Link href="/tools" className="text-indigo-600 font-semibold underline">See all PDF tools</Link>.
      </p>
    </article>
  );
}
