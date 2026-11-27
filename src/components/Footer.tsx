import Link from 'next/link';
import BrandMark from './BrandMark';
import { SITE_NAME } from '@/lib/site';
import { categoryAnchor } from '@/lib/tools-data';
import LanguageSwitcher from './LanguageSwitcher';
import type { NavData } from '@/i18n/nav';

export default function Footer({ nav }: { nav: NavData }) {
  const english = nav.locale === 'en';
  return (
    <footer className="bg-gray-950 text-gray-400 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-8 mb-8">
          {/* Brand */}
          <div className="col-span-2">
            <Link href={nav.homeHref} className="flex items-center gap-2 mb-4">
              <BrandMark className="w-8 h-8 rounded-lg" ring />
              <span className="text-lg font-bold text-white">{SITE_NAME}</span>
            </Link>
            <p className="text-sm leading-relaxed mb-4">
              {english ? 'The modern PDF toolkit. Edit, convert, merge, and optimize your PDFs entirely in your browser.' : nav.labels.footerTagline}
            </p>
            <p className="text-xs text-gray-400 mb-4">
              {nav.labels.footerPrivate}
            </p>
            <ul className="space-y-2 text-sm">
              <li><Link href={nav.hubHref} className="font-medium text-white hover:text-gray-200 transition-colors">{nav.labels.footerAllTools}</Link></li>
              <li><Link href={nav.workspace.href} className="hover:text-white transition-colors">{nav.categories[0].tools[0].name}</Link></li>
              {english && <li><Link href="/verify-no-upload" className="hover:text-white transition-colors">Verify we never upload your files</Link></li>}
            </ul>
          </div>

          {/* Every tool, grouped like the header and /tools */}
          {nav.categories.filter(c => c.id !== 'All-in-one').map((category) => (
            <div key={category.id}>
              <h3 className="text-sm font-semibold text-white mb-3">
                <Link href={`${nav.hubHref}#${categoryAnchor(category.id)}`} className="hover:text-gray-200 transition-colors">
                  {category.label}
                </Link>
              </h3>
              <ul className="space-y-2 text-sm">
                {category.tools.map((tool) => (
                  <li key={tool.slug}>
                    <Link href={tool.href} className="hover:text-white transition-colors">
                      {tool.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Learn — the guides are in English, so only English pages list them */}
          {english && (
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Learn</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/blog" className="hover:text-white transition-colors">All PDF guides</Link></li>
              <li><Link href="/blog/how-to-merge-pdf-files" className="hover:text-white transition-colors">How to merge PDFs</Link></li>
              <li><Link href="/blog/how-to-compress-a-pdf-without-losing-quality" className="hover:text-white transition-colors">Compress without quality loss</Link></li>
              <li><Link href="/blog/how-to-sign-a-pdf-electronically" className="hover:text-white transition-colors">Sign a PDF for free</Link></li>
              <li><Link href="/blog/how-to-password-protect-a-pdf-without-adobe" className="hover:text-white transition-colors">Password protect PDF</Link></li>
              <li><Link href="/blog/how-to-edit-a-pdf-without-adobe" className="hover:text-white transition-colors">Edit PDF text</Link></li>
            </ul>
          </div>
          )}
        </div>

        {/* Listed on — directory badges (reciprocal links) */}
        <div className="border-t border-gray-800 pt-6 mb-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
            {nav.labels.listedOn}
          </p>
          <ul className="flex flex-wrap items-center gap-x-2 gap-y-3">
            <li>
              <a href="https://findalternative.to" target="_blank" rel="noopener" className="inline-flex items-center rounded-full border border-gray-700 px-3 py-1.5 text-xs text-gray-300 hover:text-white hover:border-gray-500 transition-colors">
                findalternative.to
              </a>
            </li>
            <li>
              <a href="https://startupbase.io" target="_blank" rel="noopener" className="inline-flex items-center rounded-full border border-gray-700 px-3 py-1.5 text-xs text-gray-300 hover:text-white hover:border-gray-500 transition-colors">
                StartupBase
              </a>
            </li>
            <li>
              <a href="https://fazier.com" target="_blank" rel="noopener" className="inline-flex items-center rounded-full border border-gray-700 px-3 py-1.5 text-xs text-gray-300 hover:text-white hover:border-gray-500 transition-colors">
                Fazier
              </a>
            </li>
            <li>
              <a href="https://mozolist.com" target="_blank" rel="noopener" className="inline-flex items-center rounded-full border border-gray-700 px-3 py-1.5 text-xs text-gray-300 hover:text-white hover:border-gray-500 transition-colors">
                Mozolist
              </a>
            </li>
            <li>
              <a href="https://awesome.tools" target="_blank" rel="noopener" className="inline-flex items-center rounded-full border border-gray-700 px-3 py-1.5 text-xs text-gray-300 hover:text-white hover:border-gray-500 transition-colors">
                Awesome Tools
              </a>
            </li>
            <li>
              <a href="https://tools.cafe" target="_blank" rel="noopener noreferrer" aria-label="Listed on tools.cafe">
                <img src="https://tools.cafe/b/light.svg" alt="Listed on tools.cafe" width={220} height={54} className="h-7 w-auto" />
              </a>
            </li>
          </ul>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-gray-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-center sm:text-left">
            &copy; {new Date().getFullYear()} {SITE_NAME}.{english && ' Files are processed locally in your browser — only the optional Translate tool contacts an online service.'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs">
            {english && <><span>No file size limits</span><span aria-hidden="true" className="hidden sm:inline text-gray-600">|</span></>}
            <span>{nav.labels.noWatermark}</span>
            <span aria-hidden="true" className="hidden sm:inline text-gray-600">|</span>
            <span>{nav.labels.noSignup}</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs">
            <Link href="/about" className="hover:text-white transition-colors">{nav.labels.about}</Link>
            <span aria-hidden="true" className="hidden sm:inline text-gray-600">|</span>
            <Link href="/privacy" className="hover:text-white transition-colors">{nav.labels.privacy}</Link>
            <span aria-hidden="true" className="hidden sm:inline text-gray-600">|</span>
            <Link href="/terms" className="hover:text-white transition-colors">{nav.labels.terms}</Link>
            <span aria-hidden="true" className="hidden sm:inline text-gray-600">|</span>
            <LanguageSwitcher label={nav.labels.language} dropUp dark />
          </div>
        </div>
      </div>
    </footer>
  );
}
