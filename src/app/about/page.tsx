import type { Metadata } from 'next';
import Link from 'next/link';
import { Shield, Lock, BookOpenText, Mail } from 'lucide-react';
import { SITE_NAME, SITE_URL } from '@/lib/site';
import { SITE_AUTHOR } from '@/lib/author';

export const metadata: Metadata = {
  title: `About ${SITE_NAME}`,
  description:
    `${SITE_NAME} is a free, private PDF toolkit that runs entirely in your browser. Learn who writes our guides and how we keep your files secure.`,
  alternates: { canonical: '/about' },
  openGraph: {
    type: 'website',
    title: `About ${SITE_NAME}`,
    description:
      `${SITE_NAME} is a free, private PDF toolkit that runs in your browser. Learn who's behind it and how your files stay secure.`,
    url: '/about',
    siteName: SITE_NAME,
  },
  twitter: { card: 'summary', title: `About ${SITE_NAME}`, description: "Who's behind Slate PDF and how your files stay secure." },
};

export default function AboutPage() {
  const aboutSchema = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name: `About ${SITE_NAME}`,
    url: `${SITE_URL}/about`,
    mainEntity: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
      description: 'Free PDF toolkit that runs in your browser. Edit without uploading.',
    },
  };

  const personSchema = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: SITE_AUTHOR.name,
    jobTitle: SITE_AUTHOR.role,
    description: SITE_AUTHOR.bio,
    url: `${SITE_URL}/about`,
    knowsAbout: ['PDF', 'Document management', 'File formats', 'Digital signatures', 'Prepress'],
    worksFor: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
  };

  return (
    <div className="bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }} />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">About {SITE_NAME}</p>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-4">
          A free PDF toolkit that never touches your files
        </h1>
        <p className="text-lg text-gray-600 leading-relaxed mb-10">
          {SITE_NAME} is a set of free, browser-based PDF tools — merging, splitting, compressing,
          converting, signing and editing — designed around one principle: your documents should
          stay on your device. Nothing is uploaded, nothing is stored, and no account is ever needed.
        </p>

        <div className="mb-12">
          <h2 className="text-2xl font-bold text-foreground mb-4">Who writes our guides</h2>
          <div className="rounded-2xl border border-border bg-gray-50 p-6 sm:p-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-full bg-black text-white flex items-center justify-center font-bold text-xl shrink-0">
                {SITE_AUTHOR.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
              </div>
              <div>
                <p className="font-bold text-foreground text-lg">{SITE_AUTHOR.name}</p>
                <p className="text-sm text-muted-foreground">{SITE_AUTHOR.role}</p>
              </div>
            </div>
            <p className="text-[17px] leading-[1.75] text-gray-700">{SITE_AUTHOR.bio}</p>
            <p className="text-[17px] leading-[1.75] text-gray-700 mt-4">
              Every guide on this site is written from direct experience with the tools and
              workflows described. Where a method has real trade-offs — file size limits,
              quality loss, when a document will not compress as hoped — we say so plainly
              instead of pretending there is a magic fix.
            </p>
          </div>
        </div>

        <div className="mb-12">
          <h2 className="text-2xl font-bold text-foreground mb-4">Our editorial standards</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="p-6 rounded-2xl border border-border bg-white">
              <BookOpenText className="w-5 h-5 text-foreground mb-3" />
              <h3 className="font-semibold text-foreground mb-1">Experience first</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Guides are written by someone who has actually done the task, and call out
                honest limits rather than overselling.
              </p>
            </div>
            <div className="p-6 rounded-2xl border border-border bg-white">
              <Shield className="w-5 h-5 text-foreground mb-3" />
              <h3 className="font-semibold text-foreground mb-1">Reviewed, not copied</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Articles carry a "Reviewed" date and are fact-checked when formats, tools or
                best practices change.
              </p>
            </div>
            <div className="p-6 rounded-2xl border border-border bg-white">
              <Lock className="w-5 h-5 text-foreground mb-3" />
              <h3 className="font-semibold text-foreground mb-1">Private by default</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Our processing runs in your browser. The only exception is the optional
                Translate tool, which contacts an online translation service by design.
              </p>
            </div>
          </div>
        </div>

        <div className="mb-12">
          <h2 className="text-2xl font-bold text-foreground mb-4">Privacy, plainly</h2>
          <p className="text-[17px] leading-[1.75] text-gray-700 mb-4">
            Files passed through the vast majority of our tools are processed locally in your
            browser and never leave your device. We do not require an account, we do not sell
            data, and the only online dependency is the optional Translate tool. You can read
            the full details in our <Link href="/privacy" className="font-medium underline underline-offset-2">privacy policy</Link>.
          </p>
        </div>

        <div className="rounded-2xl bg-black text-white p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <Mail className="w-6 h-6 text-gray-300 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-lg font-bold mb-1">Questions or corrections?</h3>
              <p className="text-gray-300 leading-relaxed">
                If you spot something inaccurate or want to suggest a guide, email us at
                <span className="text-white font-medium"> support@slatepdf.space</span>. We read
                every message and correct errors quickly.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-10">
          <Link href="/blog" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            ← Explore all PDF guides
          </Link>
        </div>
      </div>
    </div>
  );
}
