import type { Metadata } from 'next';
import { SITE_NAME, SITE_URL } from '@/lib/site';
import { SITE_EMAIL } from '@/lib/author';

export const metadata: Metadata = {
  title: `Terms of Service | ${SITE_NAME}`,
  description:
    `The terms governing your use of ${SITE_NAME}, the free browser-based PDF toolkit.`,
  alternates: { canonical: '/terms' },
  openGraph: {
    type: 'website',
    title: `Terms of Service | ${SITE_NAME}`,
    description: `The terms governing your use of ${SITE_NAME}, the free browser-based PDF toolkit.`,
    url: '/terms',
    siteName: SITE_NAME,
  },
  twitter: {
    card: 'summary',
    title: `Terms of Service | ${SITE_NAME}`,
    description: `The terms governing your use of ${SITE_NAME}, the free browser-based PDF toolkit.`,
  },
};

export default function TermsPage() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `Terms of Service | ${SITE_NAME}`,
    url: `${SITE_URL}/terms`,
    inLanguage: 'en',
  };

  return (
    <div className="bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Legal</p>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-2">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: August 2026</p>

        <div className="space-y-8 text-[17px] leading-[1.75] text-gray-700">
          <section>
            <h2 className="text-xl font-bold text-foreground mb-2">Use of the service</h2>
            <p>
              {SITE_NAME} provides free, browser-based tools for working with PDF files. By using
              the service you agree to these terms. The tools are provided for lawful, personal
              and business use on files you are authorised to process.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-2">No warranty</h2>
            <p>
              Our tools are provided "as is" without warranty of any kind. While we work to keep
              them accurate and reliable, we are not liable for any loss or damage arising from
              their use, including from errors in processing or conversion. Where a task is
              critical — legal, financial or medical documents — always check the output before
              relying on it.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-2">Processing your files</h2>
            <p>
              You are responsible for the files you process and for ensuring you have the right
              to do so. Our core tools run locally in your browser. You are responsible for
              backing up any files you care about, since local processing does not give us a copy
              to recover later.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-2">Acceptable use</h2>
            <p>
              You agree not to use the service to process material that is unlawful, infringing,
              or to attempt to disrupt or interfere with the service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-2">Changes</h2>
            <p>
              We may update these terms from time to time. Continued use of the service after
              changes are posted constitutes acceptance of the updated terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-2">Contact</h2>
            <p>
              Questions about these terms can be sent to <span className="font-medium">{SITE_EMAIL}</span>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
