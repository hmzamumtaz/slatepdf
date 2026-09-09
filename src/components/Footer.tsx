import Link from 'next/link';
import BrandMark from './BrandMark';
import { SITE_NAME } from '@/lib/site';
import { tools, categories, getToolsByCategory } from '@/lib/tools-data';

export default function Footer() {
  return (
    <footer className="bg-gray-950 text-gray-400 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-8 gap-8 mb-8">
          {/* Brand */}
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <BrandMark className="w-8 h-8 rounded-lg" ring />
              <span className="text-lg font-bold text-white">{SITE_NAME}</span>
            </Link>
            <p className="text-sm leading-relaxed mb-4">
              The modern PDF toolkit. Edit, convert, merge, and optimize your PDFs entirely in your browser.
            </p>
            <p className="text-xs text-gray-500">
              100% private. Files never leave your device.
            </p>
          </div>

          {/* Organize */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Organize</h3>
            <ul className="space-y-2 text-sm">
              {getToolsByCategory('Organize PDF').map((tool) => (
                <li key={tool.slug}>
                  <Link href={`/tools/${tool.slug}`} className="hover:text-white transition-colors">
                    {tool.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Create */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Create</h3>
            <ul className="space-y-2 text-sm">
              {getToolsByCategory('Create PDF').map((tool) => (
                <li key={tool.slug}>
                  <Link href={`/tools/${tool.slug}`} className="hover:text-white transition-colors">
                    {tool.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Export */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Export</h3>
            <ul className="space-y-2 text-sm">
              {getToolsByCategory('Export PDF').map((tool) => (
                <li key={tool.slug}>
                  <Link href={`/tools/${tool.slug}`} className="hover:text-white transition-colors">
                    {tool.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Modify */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Modify</h3>
            <ul className="space-y-2 text-sm">
              {getToolsByCategory('Modify PDF').map((tool) => (
                <li key={tool.slug}>
                  <Link href={`/tools/${tool.slug}`} className="hover:text-white transition-colors">
                    {tool.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Secure */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Security</h3>
            <ul className="space-y-2 text-sm">
              {getToolsByCategory('PDF Security').map((tool) => (
                <li key={tool.slug}>
                  <Link href={`/tools/${tool.slug}`} className="hover:text-white transition-colors">
                    {tool.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Learn */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Learn</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/blog" className="hover:text-white transition-colors">All PDF guides</Link></li>
              <li><Link href="/blog/how-to-merge-pdf-files" className="hover:text-white transition-colors">How to merge PDFs</Link></li>
              <li><Link href="/blog/how-to-compress-a-pdf-without-losing-quality" className="hover:text-white transition-colors">Compress without quality loss</Link></li>
              <li><Link href="/blog/how-to-sign-a-pdf-electronically-for-free" className="hover:text-white transition-colors">Sign a PDF for free</Link></li>
              <li><Link href="/blog/how-to-password-protect-a-pdf-without-adobe" className="hover:text-white transition-colors">Password protect PDF</Link></li>
              <li><Link href="/blog/how-to-edit-pdf-text-without-acrobat" className="hover:text-white transition-colors">Edit PDF text</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-gray-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs">
            &copy; {new Date().getFullYear()} {SITE_NAME}. Files are processed locally in your browser — only the optional Translate tool contacts an online service.
          </p>
          <div className="flex items-center gap-4 text-xs">
            <span>No file size limits</span>
            <span className="text-gray-600">|</span>
            <span>No watermarks</span>
            <span className="text-gray-600">|</span>
            <span>No sign-up</span>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <Link href="/about" className="hover:text-white transition-colors">About</Link>
            <span className="text-gray-600">|</span>
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <span className="text-gray-600">|</span>
            <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
