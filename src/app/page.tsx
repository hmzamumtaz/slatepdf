'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Shield, Lock, ArrowRight, Globe, LayoutGrid, Server, CheckCircle2, Infinity, ChevronDown } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { categories, getToolsByCategory, featuredTool, getToolBySlug } from '@/lib/tools-data';
import ToolGrid from '@/components/ToolGrid';
import ToolsModal from '@/components/ToolsModal';
import { SITE_NAME } from '@/lib/site';
import { SITE_AUTHOR } from '@/lib/author';
import { getStats } from '@/lib/stats';

function AnimatedCounter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const duration = 1200;
          const start = performance.now();

          function tick(now: number) {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(eased * target));
            if (progress < 1) requestAnimationFrame(tick);
          }
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [target]);

  return <span ref={ref}>{count}{suffix}</span>;
}

export default function Home() {
  const [modalOpen, setModalOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [stats, setStats] = useState({ filesConverted: 0, toolsUsed: 0, globalCount: 0 });

  const popularTools = ['merge-pdf', 'compress-pdf', 'jpg-to-pdf', 'pdf-to-word', 'sign-pdf', 'edit-pdf']
    .map(getToolBySlug)
    .filter((t): t is NonNullable<typeof t> => !!t);

  useEffect(() => {
    const id = requestAnimationFrame(() => setStats(getStats()));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <ToolsModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />

      {/* Hero — conversion-first */}
      <section className="relative overflow-hidden pt-16 sm:pt-24 pb-14 sm:pb-20">
        {/* Ambient neutral glow */}
        <div aria-hidden className="pointer-events-none absolute -top-24 right-[-8%] h-[440px] w-[440px] xl:h-[540px] xl:w-[540px] rounded-full bg-gradient-to-br from-gray-900/[0.05] to-transparent blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute top-24 left-[-10%] h-[360px] w-[360px] rounded-full bg-gradient-to-tr from-gray-100 to-transparent blur-2xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-14 lg:gap-10 xl:gap-14 items-center">

            {/* Copy + actions */}
            <div className="lg:col-span-7 text-center lg:text-left animate-fade-in">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-green-50 border border-green-200 rounded-full text-sm font-medium text-green-800">
                <Shield className="w-4 h-4 text-green-600" />
                <span>Files never leave your device</span>
              </div>

              <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight leading-[1.08] text-foreground text-balance">
                Every PDF task,
                <span className="mt-3 block w-fit mx-auto lg:mx-0 bg-foreground text-white px-4 sm:px-5 rounded-xl leading-snug">
                  free and private.
                </span>
              </h1>

              <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                Merge, split, compress, convert, edit and sign documents in your browser.
                No uploads, no sign up, no watermarks and no limits.
              </p>

              <div className="mt-9 flex flex-col sm:flex-row items-center gap-3 sm:gap-4 justify-center lg:justify-start">
                <button
                  onClick={() => setModalOpen(true)}
                  className="group inline-flex w-full sm:w-auto items-center justify-center gap-2.5 px-8 py-4 bg-foreground text-white font-bold rounded-2xl transition-all hover:bg-[#27272a] hover:shadow-2xl hover:shadow-foreground/25 active:scale-[0.98] text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40 focus-visible:ring-offset-2"
                >
                  Use the tools free
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </button>
                <a
                  href="#tools"
                  className="inline-flex w-full sm:w-auto items-center justify-center gap-2 px-8 py-4 rounded-2xl border border-border bg-white text-foreground font-semibold text-base transition-all hover:border-gray-400 hover:bg-muted active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40 focus-visible:ring-offset-2"
                >
                  Browse every tool
                </a>
              </div>

              <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2.5 justify-center lg:justify-start text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-600" /> No sign up</span>
                <span className="inline-flex items-center gap-2"><Server className="w-4 h-4 text-green-600" /> No uploads</span>
                <span className="inline-flex items-center gap-2"><Infinity className="w-4 h-4 text-green-600" /> No limits</span>
                <span className="inline-flex items-center gap-2"><Lock className="w-4 h-4 text-green-600" /> 100% private</span>
              </div>
            </div>

            {/* Real tools quick launcher */}
            <div className="lg:col-span-5">
              <div className="mx-auto w-full max-w-md lg:max-w-none">
                <div className="rounded-2xl border border-gray-200 bg-white shadow-2xl shadow-gray-900/[0.08] overflow-hidden">
                  <div className="flex items-center gap-1.5 px-5 py-3.5 border-b border-gray-200 bg-gray-50">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-300" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-300" />
                    <span className="w-2.5 h-2.5 rounded-full bg-green-300" />
                    <span className="ml-3 text-xs font-semibold text-muted-foreground tracking-wide">Start with a popular tool</span>
                  </div>
                  <div className="p-3">
                    {popularTools.map((tool) => {
                      const IconComp = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>>)[tool.icon] || LucideIcons.FileText;
                      return (
                        <Link
                          key={tool.slug}
                          href={`/tools/${tool.slug}`}
                          className="group flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted transition-colors"
                        >
                          <span className="w-10 h-10 rounded-xl bg-gray-900/[0.05] flex items-center justify-center shrink-0">
                            <IconComp className="w-5 h-5 text-foreground" />
                          </span>
                          <span className="flex-1 min-w-0 text-left">
                            <span className="block text-sm font-semibold text-foreground">{tool.name}</span>
                            <span className="block text-xs text-muted-foreground truncate">{tool.description}</span>
                          </span>
                          <ArrowRight className="w-4 h-4 text-muted-foreground -translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all" />
                        </Link>
                      );
                    })}
                  </div>
                  <Link
                    href="/tools/pdf-workspace"
                    className="group flex items-center justify-center gap-2 px-5 py-3.5 border-t border-gray-200 bg-gray-50 text-sm font-semibold text-foreground hover:bg-muted transition-colors"
                  >
                    See all tools now
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
                <p className="mt-4 text-center text-xs text-muted-foreground">
                  Runs entirely in your browser with nothing uploaded anywhere
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="rounded-2xl border border-border bg-gray-50 px-6 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-3xl sm:text-4xl font-bold text-foreground tabular-nums">
                <AnimatedCounter target={38} suffix="+" />
              </div>
              <div className="text-sm text-muted-foreground mt-1">PDF Tools</div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-bold text-foreground tabular-nums">
                <AnimatedCounter target={stats.globalCount} />
              </div>
              <div className="text-sm text-muted-foreground mt-1">Files Converted</div>
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
      <section id="tools" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 scroll-mt-24">
        {categories.filter(c => c !== featuredTool.category).map((category) => (
          <div key={category} className="mb-14 last:mb-0">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-foreground">{category}</h2>
            </div>
            <ToolGrid tools={getToolsByCategory(category)} />
          </div>
        ))}
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
              { title: '38 Professional Tools', text: 'Merge multiple PDFs, split large files, compress without quality loss, convert between formats, add signatures, and password-protect documents.' },
              { title: 'Works Everywhere', text: 'Whether you are a student combining research papers, a professional preparing contracts, or anyone who works with PDFs regularly — it all runs in your browser.' },
              { title: 'Truly Free. Forever.', text: 'No sign-up required, no watermarks added to your output, no file size limits, and no hidden fees. Use every tool as many times as you want.' },
            ].map((item) => (
              <div key={item.title} className="p-6 rounded-xl bg-white border border-border">
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
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">Built for speed. Designed for privacy. Trusted by millions.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-8 rounded-2xl border border-border bg-white">
              <h3 className="text-lg font-bold mb-2 text-foreground">Your Files Stay Private</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                All processing happens on your device. Your documents never touch our servers — not during processing, not after. Perfect for confidential and sensitive work.
              </p>
            </div>

            <div className="p-8 rounded-2xl border border-border bg-white">
              <h3 className="text-lg font-bold mb-2 text-foreground">Instant Processing</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                No waiting for uploads. No server queues. Your PDF is processed the moment you hit the button — even large files handle in seconds.
              </p>
            </div>

            <div className="p-8 rounded-2xl border border-border bg-white">
              <h3 className="text-lg font-bold mb-2 text-foreground">No Limits. No Watermarks.</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Use every tool as many times as you want. No file size restrictions. No watermarks added to your output. Completely free, forever.
              </p>
            </div>
          </div>

          {/* Trust badges */}
          <div className="mt-16 pt-8 border-t border-border flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground">
            <span className="flex items-center gap-2"><Globe className="w-4 h-4" /> Works in any modern browser</span>
            <span className="flex items-center gap-2"><Lock className="w-4 h-4" /> No account required</span>
            <span className="flex items-center gap-2"><Shield className="w-4 h-4" /> No data collection</span>
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
                  <th className="text-center py-4 px-4 font-semibold text-foreground w-1/5">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded bg-foreground text-white text-[10px] font-bold flex items-center justify-center">S</span>
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
                  { feature: 'Offline / local processing', slate: true, small: false, ilove: false },
                  { feature: 'PDF editing & signing', slate: true, small: true, ilove: true },


                ].map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                    <td className="py-3.5 px-6 text-foreground font-medium">{row.feature}</td>
                    <td className="py-3.5 px-4 text-center">
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
              { href: '/blog/how-to-edit-pdf-text-without-acrobat', title: 'Edit PDF text without Acrobat', desc: 'Change wording and numbers in a PDF for free, in your browser.' },
              { href: '/blog/how-to-sign-a-pdf-electronically-for-free', title: 'Sign a PDF for free', desc: 'Add an electronic signature without signing up or paying.' },
              { href: '/blog/how-to-password-protect-a-pdf-without-adobe', title: 'Password-protect a PDF', desc: 'Lock your document with strong encryption, no Adobe needed.' },
              { href: '/blog/how-to-convert-pdf-to-word-without-losing-formatting', title: 'PDF to Word without losing formatting', desc: 'Turn a PDF into an editable document that keeps its layout.' },
            ].map((guide) => (
              <Link
                key={guide.href}
                href={guide.href}
                className="rounded-2xl border border-border bg-white p-5 hover:border-gray-300 hover:shadow-md transition-all"
              >
                <h3 className="font-bold text-foreground leading-snug mb-1.5">{guide.title}</h3>
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
            {[
              {
                q: 'What is Slate PDF?',
                a: 'Slate PDF is a free, browser-based PDF toolkit that lets you merge, split, compress, convert, edit, sign, and secure PDF files. All processing happens locally in your browser — your files never leave your device.',
              },
              {
                q: 'Is Slate PDF really free?',
                a: 'Yes. Every tool is completely free to use with no hidden fees, no subscription tiers, and no usage limits. There are no watermarks added to your output and no file size restrictions.',
              },
              {
                q: 'Are my files uploaded to your servers?',
                a: 'No. Unlike other PDF tools, Slate PDF processes everything locally in your browser using WebAssembly and client-side JavaScript. Your files are never uploaded, stored, or transmitted to any server.',
              },
              {
                q: 'Do I need to create an account?',
                a: 'No account is required. Simply visit the site, pick a tool, and start working on your PDFs immediately.',
              },
              {
                q: 'Which browsers are supported?',
                a: 'Slate PDF works in all modern browsers including Chrome, Firefox, Safari, and Edge. It runs entirely client-side, so no plugins or installations are needed.',
              },
              {
                q: 'How does Slate PDF compare to Smallpdf or iLovePDF?',
                a: 'Smallpdf and iLovePDF are great tools, but they require uploading your files to their servers for processing. Slate PDF does everything locally in your browser, which means faster processing (no upload wait), complete privacy, no file size limits, and no account required.',
              },
              {
                q: 'Can I use Slate PDF offline?',
                a: 'Yes. Once the page is loaded, all processing happens locally in your browser. If you have a stable connection to load the site initially, you can continue using the tools even if your connection drops during processing.',
              },

            ].map((faq, i) => (
              <div key={i} className="rounded-xl border border-border overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between gap-4 px-6 py-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="font-semibold text-foreground">{faq.q}</span>
                  <ChevronDown className={`w-5 h-5 text-muted-foreground shrink-0 transition-transform duration-200 ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-5 text-muted-foreground text-sm leading-relaxed">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
