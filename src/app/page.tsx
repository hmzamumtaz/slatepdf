'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Shield, Zap, Lock, ArrowRight, Sparkles, Globe, LayoutGrid } from 'lucide-react';
import { tools, categories, getToolsByCategory, featuredTool } from '@/lib/tools-data';
import ToolGrid from '@/components/ToolGrid';
import ToolsModal from '@/components/ToolsModal';
import { SITE_NAME } from '@/lib/site';

export default function Home() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white">
      <ToolsModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />

      {/* Hero */}
      <section className="pt-20 sm:pt-28 pb-16 sm:pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 border border-border rounded-full text-sm font-medium text-foreground mb-8">
              <span>{tools.length} tools, one workspace</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight mb-6 leading-[1.1] text-foreground">
              Every PDF tool
              <br />
              <span className="text-primary">
                you will ever need
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              Merge, split, convert, compress, edit, and secure your PDFs.
              No file size limits. No watermarks. No sign-up required.
            </p>

            <div className="flex items-center justify-center">
              <button
                onClick={() => setModalOpen(true)}
                className="group inline-flex items-center gap-2.5 px-8 py-4 bg-foreground text-white font-bold rounded-2xl transition-all hover:shadow-2xl hover:shadow-foreground/25 active:scale-[0.98] text-base"
              >
                Get Started
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* The one tool that does the lot */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-4">
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
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        {categories.filter(c => c !== featuredTool.category).map((category) => (
          <div key={category} className="mb-14 last:mb-0">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-foreground">{category}</h2>
            </div>
            <ToolGrid tools={getToolsByCategory(category)} />
          </div>
        ))}
      </section>

      {/* Features */}
      <section className="bg-white py-20 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-foreground">Why {SITE_NAME}?</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">Built for speed, designed for privacy</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-8 rounded-2xl bg-gray-50 border border-border hover:border-primary/30 transition-colors">
              <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center mb-6">
                <Lock className="w-7 h-7 text-indigo-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-foreground">Your Files Stay Private</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                We never see your files. All processing happens on your device, so your documents never touch our servers. Perfect for confidential and sensitive work.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-gray-50 border border-border hover:border-primary/30 transition-colors">
              <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center mb-6">
                <Zap className="w-7 h-7 text-amber-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-foreground">Instant Processing</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                No waiting for uploads. No server queues. Your PDF is processed the moment you hit the button, even large files handle in seconds.
              </p>
            </div>

            <div className="p-8 rounded-2xl bg-gray-50 border border-border hover:border-primary/30 transition-colors">
              <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mb-6">
                <Sparkles className="w-7 h-7 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-foreground">No Limits. No Watermarks.</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Use every tool as many times as you want. No file size restrictions. No watermarks added to your output. Completely free.
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

      {/* SEO content section */}
      <section className="bg-gray-50 py-16 sm:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold mb-8 text-foreground text-center">
            The Free PDF Toolkit That Runs in Your Browser
          </h2>
          <div className="prose prose-gray max-w-none">
            <p className="text-gray-600 leading-relaxed mb-6">
              {SITE_NAME} is a comprehensive, free PDF toolkit that runs entirely in your browser. Unlike traditional PDF software that requires installation and expensive subscriptions, {SITE_NAME} processes your files locally — meaning your documents never leave your device.
            </p>
            <p className="text-gray-600 leading-relaxed mb-6">
              With over {tools.length} tools covering every common PDF operation, you can merge multiple PDFs into one document, split large files into smaller pieces, compress file sizes without losing quality, convert between PDF and other formats, add electronic signatures, password-protect sensitive documents, and much more.
            </p>
            <p className="text-gray-600 leading-relaxed mb-6">
              Whether you are a student combining research papers, a professional preparing contracts, or anyone who works with PDF documents regularly, {SITE_NAME} provides the tools you need — completely free, with no sign-up required, no watermarks, and no file size limits.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
