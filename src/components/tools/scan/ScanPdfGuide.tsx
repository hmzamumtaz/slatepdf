import Link from 'next/link';

/**
 * Tool-specific explainer for /tools/scan-pdf. Replaces the generic tool copy
 * with content written for the page's real search intent: scanning to PDF
 * online, free, with the phone camera and no app.
 */
export default function ScanPdfGuide() {
  return (
    <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 text-gray-600 leading-relaxed">
      <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">Scan to PDF online, free, with your phone camera</h2>
      <p className="mb-4">
        Open this page on your phone, tap <strong>Open camera</strong> and point it at the page. The scanner finds the
        four edges, waits until you hold steady, captures the page and straightens it so it looks like it went through a
        flatbed. Add as many pages as you need, fix anything in Review, then save one PDF — with searchable text if you
        want it. There is no app to install and no account, and the pages never leave your phone.
      </p>

      <h3 className="text-lg font-semibold text-foreground mt-8 mb-3">How to scan a document to PDF</h3>
      <ol className="list-decimal pl-5 space-y-2 mb-6">
        <li>Lay the page on a darker, plain surface in good light and tap <strong>Open camera</strong>.</li>
        <li>Pick a mode — Document, Book, ID card, Business card or Whiteboard — and hold the phone over the page.</li>
        <li>When the outline turns green, keep still: Auto capture takes the shot. Turn the page and it captures the next one.</li>
        <li>Tap the thumbnail to open Review. Drag the corners if a crop is off, choose a filter, rotate, or retake a page.</li>
        <li>Tap <strong>Save PDF</strong>, name the file, leave <em>Recognize text (OCR)</em> on, and download or share it.</li>
      </ol>

      <h3 className="text-lg font-semibold text-foreground mt-8 mb-3">Scan modes</h3>
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm border border-border rounded-xl overflow-hidden">
          <thead className="bg-gray-50 text-foreground">
            <tr><th className="text-left p-3">Mode</th><th className="text-left p-3">What it does</th><th className="text-left p-3">Use it for</th></tr>
          </thead>
          <tbody className="divide-y divide-border">
            <tr><td className="p-3 font-medium text-foreground">Document</td><td className="p-3">Finds the page, flattens it and evens out shadows</td><td className="p-3">Letters, forms, contracts, homework</td></tr>
            <tr><td className="p-3 font-medium text-foreground">Book</td><td className="p-3">Splits an open spread into a left and a right page</td><td className="p-3">Books, notebooks, magazines</td></tr>
            <tr><td className="p-3 font-medium text-foreground">ID card</td><td className="p-3">Scans the front, then the back, and puts both on one A4 page at real size</td><td className="p-3">ID copies for applications and rentals</td></tr>
            <tr><td className="p-3 font-medium text-foreground">Business card</td><td className="p-3">Crops the card and reads the name, phone, email and website into a contact you can save</td><td className="p-3">Cards from meetings and events</td></tr>
            <tr><td className="p-3 font-medium text-foreground">Whiteboard</td><td className="p-3">Whitens glare and boosts marker colours</td><td className="p-3">Meeting notes, lecture boards</td></tr>
          </tbody>
        </table>
      </div>

      <h3 className="text-lg font-semibold text-foreground mt-8 mb-3">Fixing a page after you scan it</h3>
      <p className="mb-4">
        Nothing is final until you save. Every page keeps the original photo, so you can re-crop with the corner handles
        (a magnifier shows exactly where the edge is), rotate, switch between Auto color, Light text, Grayscale, B&amp;W and
        Whiteboard filters, adjust brightness and contrast, brush away a stain or a finger with Cleanup, or draw, highlight,
        type and sign with Markup. Undo works on every change, and Revert takes a page back to how it was captured.
      </p>

      <h3 className="text-lg font-semibold text-foreground mt-8 mb-3">An online scanner vs a scanner app</h3>
      <div className="overflow-x-auto mb-6">
        <table className="w-full text-sm border border-border rounded-xl overflow-hidden">
          <thead className="bg-gray-50 text-foreground">
            <tr><th className="text-left p-3"></th><th className="text-left p-3">This page</th><th className="text-left p-3">Typical scanner app</th></tr>
          </thead>
          <tbody className="divide-y divide-border">
            <tr><td className="p-3 font-medium text-foreground">Install</td><td className="p-3">None — it is a web page</td><td className="p-3">App store download</td></tr>
            <tr><td className="p-3 font-medium text-foreground">Account</td><td className="p-3">Not needed</td><td className="p-3">Often required for saving or exporting</td></tr>
            <tr><td className="p-3 font-medium text-foreground">Where pages go</td><td className="p-3">Stay on your device</td><td className="p-3">Frequently synced to the vendor&apos;s cloud</td></tr>
            <tr><td className="p-3 font-medium text-foreground">Watermark / page limits</td><td className="p-3">None</td><td className="p-3">Common on free tiers</td></tr>
            <tr><td className="p-3 font-medium text-foreground">Searchable PDF (OCR)</td><td className="p-3">Free, on the device</td><td className="p-3">Often a paid feature</td></tr>
            <tr><td className="p-3 font-medium text-foreground">Works offline</td><td className="p-3">Scanning yes; OCR needs one download of its language model</td><td className="p-3">Usually yes</td></tr>
          </tbody>
        </table>
      </div>

      <h3 className="text-lg font-semibold text-foreground mt-8 mb-3">Is it private?</h3>
      <p className="mb-4">
        Yes. The camera feed, edge detection, filters, text recognition and PDF creation all run inside your browser.
        Scanned pages are kept on this device so a reload doesn&apos;t lose them, and saved PDFs appear under Recent scans —
        also only on this device. You can add a password before saving if the file will be shared.
      </p>

      <div className="rounded-2xl bg-violet-50 border border-violet-200 p-5 my-8">
        <p className="font-semibold text-foreground mb-1">Get a sharper scan in ten seconds</p>
        <p className="text-sm">
          Put the page on a dark table, not a white one, and stand so your shadow doesn&apos;t fall across it. Edge detection
          locks on fastest with contrast around the page, and the filters can only even out light that is there to begin with.
          In a dim room, turn on the flash from the top bar.
        </p>
      </div>

      <h3 className="text-lg font-semibold text-foreground mt-8 mb-3">What it can&apos;t do</h3>
      <ul className="list-disc pl-5 space-y-1.5 mb-6">
        <li>It is not a flatbed: glossy photos and deeply curved book spines still show some reflection or bend.</li>
        <li>Text recognition is as good as the photo — blurred or very small print will have mistakes, so check names and numbers.</li>
        <li>Business-card fields are read automatically and should be checked before you save the contact.</li>
      </ul>

      <h3 className="text-lg font-semibold text-foreground mt-8 mb-3">Guides for specific jobs</h3>
      <ul className="list-disc pl-5 space-y-1.5">
        <li><Link href="/blog/how-to-scan-multiple-pages-into-one-pdf" className="text-violet-700 underline">Scan multiple pages into one PDF</Link></li>
        <li><Link href="/blog/how-to-scan-an-id-card-to-pdf" className="text-violet-700 underline">Scan the front and back of an ID card on one page</Link></li>
        <li><Link href="/blog/how-to-scan-a-book-into-a-pdf" className="text-violet-700 underline">Scan a book into a PDF</Link></li>
        <li><Link href="/blog/how-to-make-a-scanned-pdf-searchable" className="text-violet-700 underline">Make a scanned PDF searchable</Link></li>
        <li>Already have a scanned PDF that is too big? <Link href="/tools/compress-pdf" className="text-violet-700 underline">Compress it</Link>.</li>
      </ul>
    </section>
  );
}
