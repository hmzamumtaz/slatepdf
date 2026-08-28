import type { Metadata } from 'next';
import { SITE_NAME, SITE_URL } from '@/lib/site';
import { SITE_EMAIL } from '@/lib/author';

export const metadata: Metadata = {
  title: `Privacy Policy | ${SITE_NAME}`,
  description:
    `How ${SITE_NAME} handles your data. Files are processed locally in your browser and never uploaded.`,
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPage() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `Privacy Policy | ${SITE_NAME}`,
    url: `${SITE_URL}/privacy`,
    inLanguage: 'en',
  };

  return (
    <div className="bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Legal</p>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: August 2026</p>

        <div className="space-y-8 text-[17px] leading-[1.75] text-gray-700">
          <section>
            <h2 className="text-xl font-bold text-foreground mb-2">The short version</h2>
            <p>
              {SITE_NAME} processes your PDFs directly in your browser. For the overwhelming
              majority of our tools, your files are never uploaded to our servers — they never
              leave your device. We do not require an account, and we do not sell or share
              personal data.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-2">What we process and where</h2>
            <p>
              All of our core tools — merging, splitting, compressing, converting, signing,
              editing, protecting and more — run locally in your browser using the file you
              select. The file itself is read only by the JavaScript running on your device and
              is not transmitted to us.
            </p>
            <p className="mt-3">
              The one exception is the optional <strong>Translate</strong> tool, which sends the
              extracted text to a third-party translation service in order to translate it. If
              you use that tool, that text is processed by the translation provider. The other
              tools do not contact any online service with your content.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-2">Data we may collect</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong>Analytics.</strong> We use Google Analytics to understand aggregate
                behaviour on the site — which pages are visited and how the site performs. This
                does not include the contents of your PDFs. You can opt out via your browser{"'"}s
                cookie or analytics settings.
              </li>
              <li>
                <strong>Support contact.</strong> If you email us, we keep that correspondence
                only to respond to you and resolve your request.
              </li>
            </ul>
            <p className="mt-3">
              We do not store the PDFs you process, and once you close the tab they are gone.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-2">Advertising</h2>
            <p>
              We do not sell your data, and we have no advertising network sharing your
              information with third parties.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-2">Contact</h2>
            <p>
              Questions about this policy can be sent to <span className="font-medium">{SITE_EMAIL}</span>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
