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

        {/* Bottom bar */}
        <div className="border-t border-gray-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs">
            &copy; {new Date().getFullYear()} {SITE_NAME}.{english && ' Files are processed locally in your browser — only the optional Translate tool contacts an online service.'}
          </p>
          <div className="flex items-center gap-4 text-xs">
            {english && <><span>No file size limits</span><span className="text-gray-600">|</span></>}
            <span>{nav.labels.noWatermark}</span>
            <span className="text-gray-600">|</span>
            <span>{nav.labels.noSignup}</span>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <Link href="/about" className="hover:text-white transition-colors">{nav.labels.about}</Link>
            <span className="text-gray-600">|</span>
            <Link href="/privacy" className="hover:text-white transition-colors">{nav.labels.privacy}</Link>
            <span className="text-gray-600">|</span>
            <Link href="/terms" className="hover:text-white transition-colors">{nav.labels.terms}</Link>
            <span className="text-gray-600">|</span>
            <LanguageSwitcher label={nav.labels.language} dropUp dark />
          </div>
        </div>
      </div>
    </footer>
  );
}
