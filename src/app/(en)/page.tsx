'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { Shield, Lock, ArrowRight, Camera, Globe, LayoutGrid, CheckCircle2, Infinity, ChevronDown, Search, X, Zap, ShieldCheck, BadgeCheck, Merge, ArrowUpRight, FileText, CloudUpload, Download, Laptop } from 'lucide-react';
import { toolIcon } from '@/components/tool-icons';
import { categories, categoryAnchor, getToolsByCategory, featuredTool, getToolBySlug, tools } from '@/lib/tools-data';
import ToolGrid from '@/components/ToolGrid';
import CategoryExplorer from '@/components/CategoryExplorer';
import { SITE_NAME, SITE_URL } from '@/lib/site';
import { SITE_AUTHOR } from '@/lib/author';

/** Every tool as an ItemList, so the homepage's tool grid is explicit to crawlers. */
const toolListSchema = {
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: `${SITE_NAME} PDF tools`,
  numberOfItems: tools.length,
  itemListElement: tools.map((t, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: t.name,
    url: `${SITE_URL}/tools/${t.slug}`,
  })),
};

/**
 * Homepage FAQ. Rendered as <details> so every answer is in the HTML (crawlers
 * and answer engines read collapsed answers), and mirrored in FAQPage schema.
 */
const homeFaqs = [
  {
    q: `What is ${SITE_NAME}?`,
    a: `${SITE_NAME} is a free, browser-based PDF toolkit with ${tools.length} tools to merge, split, compress, convert, edit, sign, OCR and protect PDF files. Processing happens locally in your browser, so your files never leave your device. There is no account, no watermark and no paid tier.`,
  },
  {
    q: `Is ${SITE_NAME} really free?`,
    a: 'Yes. Every tool is free with no subscription, no daily task limit and no watermark on your output. Because the work runs on your own device, there is no server cost to recover through a paid plan.',
  },
  {
    q: 'Are my files uploaded to your servers?',
    a: `No. ${SITE_NAME} processes files in your browser with JavaScript and WebAssembly, so they are never uploaded, stored or transmitted. The one exception is Translate PDF, which sends the extracted text to a translation service and tells you before it does. You can check this yourself in your browser's Network tab.`,
  },
  {
    q: 'Do I need to create an account?',
    a: 'No account is required. Visit the site, pick a tool and start working on your PDFs immediately.',
  },
  {
    q: 'Is there a file size limit?',
    a: 'There is no upload limit, because nothing is uploaded. The practical limit is your device memory: a laptop or desktop handles large PDFs comfortably, while phones have less memory, so very large files are better done on a computer.',
  },
  {
    q: 'Which browsers and devices are supported?',
    a: `${SITE_NAME} works in current versions of Chrome, Edge, Firefox and Safari on Windows, Mac, Linux, Chromebook, Android and iPhone. No plugin or installation is needed.`,
  },
  {
    q: `How does ${SITE_NAME} compare to Smallpdf or iLovePDF?`,
    a: `Smallpdf and iLovePDF are capable tools that upload your files to their servers and limit free use. ${SITE_NAME} does the work in your browser instead: no upload wait, no daily cap and no account. They are the better choice for cloud storage integrations, team features and layout-perfect PDF to Word conversion.`,
  },
  {
    q: `Can I use ${SITE_NAME} offline?`,
    a: 'You need an internet connection to open the site. Once a tool has loaded, it keeps working if your connection drops, because the processing happens on your device. Translate PDF always needs a connection, and OCR needs one the first time to download its language data.',
  },
];

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: homeFaqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
};

const POPULAR_SLUGS = new Set(['merge-pdf', 'compress-pdf', 'jpg-to-pdf', 'pdf-to-word', 'sign-pdf', 'edit-pdf']);
/** Popular tools carry a "Popular" badge in the grid, like Smallpdf's featured row. */
const withBadges = (list: typeof tools) => list.map((t) => (POPULAR_SLUGS.has(t.slug) ? { ...t, badge: 'Popular' } : t));

export default function Home() {
  const [toolQuery, setToolQuery] = useState('');
  const toolsRef = useRef<HTMLElement>(null);
  const query = toolQuery.trim().toLowerCase();
  const searchResults = query
    ? withBadges(tools.filter((t) => `${t.name} ${t.description} ${t.category}`.toLowerCase().includes(query)))
    : null;

  /** Typing in the hero search jumps the tools grid into view, so results
      are visible as you type — the grid itself stays the single result list. */
  const onHeroSearch = (value: string) => {
    if (!query && value.trim()) toolsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setToolQuery(value);
  };

  const popularTools = [...POPULAR_SLUGS]
    .map(getToolBySlug)
    .filter((t): t is NonNullable<typeof t> => !!t);

  return (
    <div className="min-h-screen bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(toolListSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />

      {/* Hero — tools-first, built around the one claim competitors can't
          make: the file never leaves the device. The "where does your file
          go?" strip shows that contrast instead of just asserting it. */}
      <section className="relative overflow-hidden pt-12 sm:pt-16 pb-14 sm:pb-20">
        {/* Dot grid, faded out towards the edges */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(rgba(15,15,15,0.10) 1px, transparent 1px)',
            backgroundSize: '22px 22px',
            maskImage: 'radial-gradient(ellipse 70% 55% at 50% 25%, black 30%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 70% 55% at 50% 25%, black 30%, transparent 100%)',
          }}
        />
        <div aria-hidden className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[460px] w-[820px] rounded-full bg-gradient-to-b from-green-400/[0.10] to-transparent blur-3xl" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center animate-fade-in">
          <div className="inline-flex items-center gap-2.5 pl-3 pr-4 py-1.5 bg-white border border-border rounded-full text-sm font-medium text-foreground shadow-sm">
            <span className="relative flex w-2 h-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-60 animate-ping" />
              <span className="relative inline-flex w-2 h-2 rounded-full bg-green-500" />
            </span>
            Free forever · No account · No uploads
          </div>

          <h1 className="mt-6 text-[2.6rem] sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.04] text-foreground text-balance">
            Every PDF tool you need.
            <span className="block bg-gradient-to-r from-gray-400 via-gray-500 to-gray-400 bg-clip-text text-transparent pb-1">
              Zero uploads.
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed text-pretty">
            Merge, split, compress, convert, edit and sign PDFs right in your browser.
            Free, no sign up, no watermark — and your files never leave your device.
          </p>

          {/* Search-first: the fastest way to a tool is to type its name.
              Typing jumps to the grid below. */}
          <div className="mt-8 relative max-w-2xl mx-auto">
            <Search className="w-5 h-5 text-muted-foreground absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={toolQuery}
              onChange={(e) => onHeroSearch(e.target.value)}
              placeholder={`Search ${tools.length} PDF tools…`}
              aria-label="Search tools"
              className="w-full pl-13 pr-24 py-4 sm:py-5 rounded-2xl border border-border bg-white text-base sm:text-lg text-foreground placeholder:text-muted-foreground shadow-lg shadow-gray-900/[0.07] focus:outline-none focus:ring-4 focus:ring-foreground/10 focus:border-foreground/40 [&::-webkit-search-cancel-button]:hidden"
            />
            {toolQuery ? (
              <button
                onClick={() => setToolQuery('')}
                aria-label="Clear search"
                className="absolute right-4 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <kbd className="hidden sm:inline-flex absolute right-4 top-1/2 -translate-y-1/2 px-2 py-1 rounded-lg border border-border bg-muted text-xs font-semibold text-muted-foreground pointer-events-none">
                Ctrl K
              </kbd>
            )}
          </div>

          {/* Where does your file go? — the differentiator, shown not told. */}
          <div className="mt-8 max-w-3xl mx-auto text-left rounded-2xl border border-border bg-white/90 backdrop-blur shadow-[var(--shadow-card)] overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 px-5 py-4">
              <span className="sm:w-40 shrink-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Typical PDF sites</span>
              <div className="flex flex-1 items-center gap-1.5 sm:gap-2.5 text-xs sm:text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5 whitespace-nowrap"><FileText className="w-4 h-4" /> Your file</span>
                <ArrowRight className="w-3.5 h-3.5 shrink-0 text-gray-300" />
                <span className="inline-flex items-center gap-1.5 whitespace-nowrap px-2 py-0.5 rounded-md bg-red-50 text-red-700"><CloudUpload className="w-4 h-4" /> Their server</span>
                <ArrowRight className="w-3.5 h-3.5 shrink-0 text-gray-300" />
                <span className="inline-flex items-center gap-1.5 whitespace-nowrap"><Download className="w-4 h-4" /> Back to you</span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 px-5 py-4 border-t border-border bg-green-50/60">
              <span className="sm:w-40 shrink-0 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-foreground">
                <span aria-hidden="true" className="w-4 h-4 rounded bg-foreground text-white text-[9px] font-bold flex items-center justify-center">S</span>
                {SITE_NAME}
              </span>
              <div className="flex flex-1 items-center gap-1.5 sm:gap-2.5 text-xs sm:text-sm text-foreground font-medium">
                <span className="inline-flex items-center gap-1.5 whitespace-nowrap"><FileText className="w-4 h-4" /> Your file</span>
                <ArrowRight className="w-3.5 h-3.5 shrink-0 text-green-600" />
                <span className="inline-flex items-center gap-1.5 whitespace-nowrap px-2 py-0.5 rounded-md bg-green-100 text-green-800"><Laptop className="w-4 h-4" /> Your browser</span>
                <span className="ml-auto hidden sm:inline-flex items-center gap-1.5 whitespace-nowrap text-green-700"><CheckCircle2 className="w-4 h-4" /> Never sent</span>
              </div>
            </div>
          </div>

          {/* Popular tools as cards */}
          <div className="mt-10 sm:mt-12">
            <p className="eyebrow text-muted-foreground mb-5">Most used</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-left">
              {popularTools.map((tool) => {
                const IconComp = toolIcon(tool.icon);
                return (
                  <Link
                    key={tool.slug}
                    href={`/tools/${tool.slug}`}
                    className="tool-card group relative flex flex-col p-4 bg-white border border-border rounded-2xl hover:border-foreground/25"
                  >
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center mb-3 transition-transform group-hover:scale-110"
                      style={{ backgroundColor: `${tool.color}14` }}
                    >
                      <IconComp className="w-5 h-5" style={{ color: tool.color }} />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground leading-tight">{tool.name}</h3>
                    <p className="mt-1 text-xs text-muted-foreground leading-snug line-clamp-2">{tool.description}</p>
                    <ArrowUpRight className="absolute top-4 right-4 w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                );
              })}
            </div>
            <a href="#tools" className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-foreground hover:underline underline-offset-4">
              Browse all {tools.length} tools <ChevronDown className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>

      {/* Stats bar — only figures that are true in the HTML itself.
          The old "Files Converted" counter was a per-visitor localStorage
          estimate that rendered as 0 to crawlers and to first paint, and the
          tool count was hardcoded to 38 while tools.length is 39. Both are
          gone; the tool count now comes from tools.length. */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="rounded-2xl border border-border bg-gray-50 px-6 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-3xl sm:text-4xl font-bold text-foreground tabular-nums">
                {tools.length}+
              </div>
              <div className="text-sm text-muted-foreground mt-1">PDF Tools</div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-bold text-foreground tabular-nums">100%</div>
              <div className="text-sm text-muted-foreground mt-1">Free Forever</div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-bold text-foreground tabular-nums">0s</div>
              <div className="text-sm text-muted-foreground mt-1">Upload Wait Time</div>
            </div>
          </div>
        </div>
      </section>

      {/* The one tool that does the lot */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-2">
        <Link
          href={`/tools/${featuredTool.slug}`}
          className="group block rounded-3xl bg-foreground text-white p-8 sm:p-10 transition-all hover:shadow-2xl hover:shadow-foreground/25"
        >
          <div className="flex flex-col lg:flex-row lg:items-center gap-8">
            <div className="flex-1 min-w-0">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold tracking-wide uppercase mb-4">
                <LayoutGrid className="w-3.5 h-3.5" /> Featured
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold mb-3">{featuredTool.name}</h2>
              <p className="text-white/70 text-base leading-relaxed max-w-2xl">
                Open one document and do everything to it in one sitting. Rewrite the text, black out what
                should not be seen, reorder the pages, sign it, stamp it, then lock it — each step picks up
                exactly where the last one left off, and you can download the file at any point.
              </p>
              <span className="inline-flex items-center gap-2 mt-6 font-semibold">
                Open the workspace
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </div>

            <ol className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-x-6 gap-y-2 shrink-0 lg:w-72">
              {['Edit', 'Redact', 'Pages', 'Sign', 'Stamp', 'Adjust', 'Protect', 'Download'].map((step, i) => (
                <li key={step} className="flex items-center gap-2 text-sm text-white/80">
                  <span className="w-5 h-5 rounded-md bg-white/10 flex items-center justify-center text-[11px] tabular-nums">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </Link>
      </section>

      {/* Tools by Category */}
      {/* The phone scanner — the other headline tool */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <Link
          href="/tools/scan-pdf"
          className="group flex flex-col sm:flex-row sm:items-center gap-5 rounded-3xl border border-border bg-white p-6 sm:p-8 transition-all hover:shadow-xl"
        >
          <span className="w-14 h-14 rounded-2xl bg-foreground text-white flex items-center justify-center shrink-0">
            <Camera className="w-7 h-7" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-xl sm:text-2xl font-bold text-foreground">Scan to PDF with your phone camera</span>
            <span className="block text-gray-600 mt-1.5 leading-relaxed">
              A full document scanner in your browser: it finds the page, captures it when you hold steady, straightens it
              and removes shadows. Book, ID card, business card and whiteboard modes, signatures and searchable text — no app.
            </span>
          </span>
          <span className="inline-flex items-center gap-2 font-semibold text-foreground shrink-0">
            Start scanning <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </Link>
      </section>

      <section ref={toolsRef} id="tools" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 scroll-mt-24">
        {searchResults ? (
          <>
            <p className="mb-6 text-sm text-muted-foreground" role="status">
              {searchResults.length === 0
                ? `No tools match “${toolQuery.trim()}”. Try a shorter word, like “pdf” or “image”.`
                : `${searchResults.length} tool${searchResults.length === 1 ? '' : 's'} found`}
            </p>
            {searchResults.length > 0 && <ToolGrid tools={searchResults} />}
          </>
        ) : (
          <CategoryExplorer
            categories={categories
              .filter((c) => c !== featuredTool.category)
              .map((c) => ({ id: c, label: c, anchorId: categoryAnchor(c), tools: withBadges(getToolsByCategory(c)) }))}
            allLabel="All tools"
          />
        )}
      </section>

      {/* The Free PDF Toolkit — descriptive section */}
      <section className="bg-gray-50 border-y border-border py-20 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-foreground">The Free PDF Toolkit That Runs in Your Browser</h2>
            <p className="text-muted-foreground text-lg max-w-3xl mx-auto leading-relaxed">
              Unlike traditional PDF software that requires installation and expensive subscriptions,
              Slate PDF processes your files locally — meaning your documents never leave your device.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: Merge, title: `${tools.length} Free PDF Tools`, text: 'Merge multiple PDFs, split large files, compress to the size you need, convert between formats, add signatures, and password-protect documents.' },
              { icon: Globe, title: 'Works Everywhere', text: 'Whether you are a student combining research papers, a professional preparing contracts, or anyone who works with PDFs regularly — it all runs in your browser.' },
              { icon: BadgeCheck, title: 'Truly Free. Forever.', text: 'No sign-up required, no watermarks added to your output, no upload size limits, and no hidden fees. Use every tool as many times as you want.' },
            ].map((item) => (
              <div key={item.title} className="p-6 rounded-2xl bg-white border border-border shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-lift)] hover:-translate-y-0.5 transition-all">
                <span className="w-11 h-11 rounded-xl bg-foreground text-white flex items-center justify-center mb-4">
                  <item.icon className="w-5 h-5" />
                </span>
                <h3 className="font-semibold mb-2 text-foreground">{item.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why SlatePDF */}
      <section className="bg-white py-20 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-foreground">Why {SITE_NAME}?</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">Built for speed. Designed for privacy.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: ShieldCheck, title: 'Your Files Stay Private', text: 'All processing happens on your device. Your documents never touch our servers — not during processing, not after. Perfect for confidential and sensitive work.' },
              { icon: Zap, title: 'Instant Processing', text: 'No waiting for uploads. No server queues. Your PDF is processed the moment you hit the button — even large files handle in seconds.' },
              { icon: Infinity, title: 'No Limits. No Watermarks.', text: 'Use every tool as many times as you want. No file size restrictions. No watermarks added to your output. Completely free, forever.' },
            ].map((item) => (
              <div key={item.title} className="p-8 rounded-2xl border border-border bg-white shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-lift)] hover:-translate-y-0.5 transition-all">
                <span className="w-11 h-11 rounded-xl bg-foreground text-white flex items-center justify-center mb-4">
                  <item.icon className="w-5 h-5" />
                </span>
                <h3 className="text-lg font-bold mb-2 text-foreground">{item.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>

          {/* Trust badges */}
          <div className="mt-16 pt-8 border-t border-border flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground">
            <span className="flex items-center gap-2"><Globe className="w-4 h-4" /> Works in any modern browser</span>
            <span className="flex items-center gap-2"><Lock className="w-4 h-4" /> No account required</span>
            <span className="flex items-center gap-2"><Shield className="w-4 h-4" /> No file uploads</span>
          </div>
        </div>
      </section>

      {/* Comparison — SlatePDF vs Smallpdf vs iLovePDF */}
      <section className="bg-gray-50 border-y border-border py-20 sm:py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-foreground">How {SITE_NAME} Compares</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              See how we stack up against the most popular online PDF tools.
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-border bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-4 px-6 font-semibold text-foreground w-2/5">Feature</th>
                  <th className="text-center py-4 px-4 font-semibold text-foreground w-1/5 bg-gray-50">
                    <span className="inline-flex items-center gap-1.5">
                      <span aria-hidden="true" className="w-5 h-5 rounded bg-foreground text-white text-[10px] font-bold flex items-center justify-center">S</span>
                      Slate PDF
                    </span>
                  </th>
                  <th className="text-center py-4 px-4 font-semibold text-muted-foreground w-1/5">Smallpdf</th>
                  <th className="text-center py-4 px-4 font-semibold text-muted-foreground w-1/5">iLovePDF</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { feature: 'Files uploaded to servers', slate: false, small: true, ilove: true },
                  { feature: 'No account required', slate: true, small: false, ilove: false },
                  { feature: 'No file size limits', slate: true, small: false, ilove: false },
                  { feature: 'No watermarks on output', slate: true, small: false, ilove: false },
                  { feature: 'Completely free forever', slate: true, small: false, ilove: false },
                  { feature: 'Processes files on your device', slate: true, small: false, ilove: false },
                  { feature: 'PDF editing & signing', slate: true, small: true, ilove: true },


                ].map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                    <td className="py-3.5 px-6 text-foreground font-medium">{row.feature}</td>
                    <td className="py-3.5 px-4 text-center bg-gray-50/70">
                      {row.slate ? (
                        <span className="inline-flex w-6 h-6 items-center justify-center rounded-full bg-green-100">
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        </span>
                      ) : (
                        <span className="inline-flex w-6 h-6 items-center justify-center rounded-full bg-red-50 text-red-400 text-xs font-bold">X</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {row.small ? (
                        <span className="inline-flex w-6 h-6 items-center justify-center rounded-full bg-green-100">
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        </span>
                      ) : (
                        <span className="inline-flex w-6 h-6 items-center justify-center rounded-full bg-red-50 text-red-400 text-xs font-bold">X</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {row.ilove ? (
                        <span className="inline-flex w-6 h-6 items-center justify-center rounded-full bg-green-100">
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        </span>
                      ) : (
                        <span className="inline-flex w-6 h-6 items-center justify-center rounded-full bg-red-50 text-red-400 text-xs font-bold">X</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Smallpdf and iLovePDF are registered trademarks of their respective owners.
          </p>
        </div>
      </section>

      {/* Editorial credibility — E-E-A-T */}
      <section className="bg-white py-10 sm:py-12 border-b border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 rounded-2xl border border-border bg-gray-50 p-6 sm:p-8">
            <div className="w-12 h-12 rounded-full bg-black text-white flex items-center justify-center font-bold text-lg shrink-0">
              {SITE_AUTHOR.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">
                Written and reviewed by {SITE_AUTHOR.name}, {SITE_AUTHOR.role}
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed mt-1">
                Every guide is written from hands-on experience and independently fact-checked.
                Nothing here is auto-generated — see how we keep content accurate on the{' '}
                <Link href="/about" className="font-medium underline underline-offset-2 hover:opacity-70">About page</Link>.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Guides — crawl path from the homepage to the blog */}
      <section className="bg-gray-50 border-b border-border py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold mb-3 text-foreground">PDF guides that get the job done</h2>
              <p className="text-muted-foreground text-lg max-w-2xl leading-relaxed">
                Step-by-step tutorials for the most common PDF tasks — written from hands-on experience and regularly fact-checked.
              </p>
            </div>
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-foreground text-white font-semibold text-sm hover:opacity-90 transition-opacity shrink-0"
            >
              See all guides <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { href: '/blog/how-to-merge-pdf-files', title: 'How to merge PDF files', desc: 'Combine multiple PDFs into one document in a few clicks.' },
              { href: '/blog/how-to-compress-a-pdf-without-losing-quality', title: 'Compress a PDF without losing quality', desc: 'Shrink large files while keeping text and images crisp.' },
              { href: '/blog/how-to-edit-a-pdf-without-adobe', title: 'Edit PDF text without Acrobat', desc: 'Change wording and numbers in a PDF for free, in your browser.' },
              { href: '/blog/how-to-sign-a-pdf-electronically', title: 'Sign a PDF for free', desc: 'Add an electronic signature without signing up or paying.' },
              { href: '/blog/how-to-password-protect-a-pdf-without-adobe', title: 'Password-protect a PDF', desc: 'Lock your document with strong encryption, no Adobe needed.' },
              { href: '/blog/how-to-convert-pdf-to-word-without-losing-formatting', title: 'PDF to Word without losing formatting', desc: 'Turn a PDF into an editable document that keeps its layout.' },
              { href: '/blog/how-to-compress-a-pdf-for-whatsapp', title: 'Compress a PDF for WhatsApp', desc: 'Shrink a file to WhatsApp’s 16 MB limit — free, in your browser.' },
              { href: '/blog/how-to-reduce-pdf-file-size-to-100kb', title: 'Reduce a PDF to 100KB', desc: 'Hit an exact file size for a form or portal, without guessing.' },
              { href: '/blog/ircc-document-upload-file-size-limit', title: 'IRCC document upload file size limit', desc: 'Get a Canada immigration PDF under the 4 MB limit — passport copies under 2 MB.' },
            ].map((guide) => (
              <Link
                key={guide.href}
                href={guide.href}
                className="group relative rounded-2xl border border-border bg-white p-5 shadow-[var(--shadow-card)] hover:border-foreground/25 hover:shadow-[var(--shadow-lift)] hover:-translate-y-0.5 transition-all"
              >
                <ArrowUpRight className="w-4 h-4 text-muted-foreground absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                <h3 className="font-bold text-foreground leading-snug mb-1.5 pr-5">{guide.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{guide.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-white py-20 sm:py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-foreground">Frequently Asked Questions</h2>
            <p className="text-muted-foreground text-lg">Everything you need to know about {SITE_NAME}.</p>
          </div>

          <div className="space-y-3">
            {homeFaqs.map((faq, i) => (
              <details key={faq.q} open={i === 0} className="group rounded-xl border border-border overflow-hidden open:bg-gray-50">
                <summary className="w-full flex items-center justify-between gap-4 px-6 py-4 text-left cursor-pointer list-none hover:bg-gray-50 transition-colors">
                  <span className="font-semibold text-foreground">{faq.q}</span>
                  <ChevronDown className="w-5 h-5 text-muted-foreground shrink-0 transition-transform duration-200 group-open:rotate-180" />
                </summary>
                <div className="px-6 pb-5 text-muted-foreground text-sm leading-relaxed">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
