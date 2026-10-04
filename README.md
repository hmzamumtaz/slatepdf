# Slate PDF

**Free PDF tools that run in your browser — [slatepdf.space](https://slatepdf.space)**

Merge, split, compress, convert, sign, redact, OCR and edit PDFs without
uploading them. Every operation runs on the user's own device, so files never
leave it. No account, no watermark.

> The one exception is **Translate PDF**, which sends text to a public
> translation service. The tool says so in its own interface.

### Highlights

- **[Scan to PDF](https://slatepdf.space/tools/scan-pdf)** — a full document
  scanner in the browser: live edge detection with auto-capture, perspective
  correction, Document / Book / ID card / Business card / Whiteboard modes,
  shadow-removing filters, markup and signatures, and on-device OCR for
  searchable PDFs.
- **[Merge](https://slatepdf.space/tools/merge-pdf)**,
  **[split](https://slatepdf.space/tools/split-pdf)** and
  **[organize](https://slatepdf.space/tools/organize-pdf)** pages.
- **[Compress PDF](https://slatepdf.space/tools/compress-pdf)** to a target size.
- **[Edit PDF](https://slatepdf.space/tools/edit-pdf)**,
  **[sign](https://slatepdf.space/tools/sign-pdf)** and
  **[redact](https://slatepdf.space/tools/redact-pdf)**.
- **[OCR PDF](https://slatepdf.space/tools/ocr-pdf)** — make scanned PDFs searchable.
- Converters between PDF and Word, Excel, PowerPoint, JPG, HEIC, WebP, TIFF,
  SVG, EPUB, HTML and Markdown.

See the full list at **[slatepdf.space](https://slatepdf.space)**, or the
[guides](https://slatepdf.space/blog) for step-by-step help.

### How it stays private

PDFs are parsed and written with [pdf-lib](https://github.com/Hopding/pdf-lib)
and [pdf.js](https://github.com/mozilla/pdf.js) inside the page; OCR runs with
[Tesseract.js](https://github.com/naptha/tesseract.js) in a Web Worker; the
scanner's edge detection, perspective warp and filters are plain canvas code in
`src/lib/document-scanner.ts`. The site is a static export with no backend to
upload to.

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
```

## Build

```bash
npm run build    # static export to ./out
npm run lint
npx tsx scripts/validate-blog.ts   # checks every article for length, metadata and dead links
```

The site is a static export (`output: 'export'` in `next.config.ts`), so the
build produces plain HTML that can be served from any host.

## Layout

| Path | What lives there |
| --- | --- |
| `src/app/tools/<slug>/` | One page per tool |
| `src/app/blog/` | Blog index and article pages |
| `src/lib/pdf-engine.ts` | The shared PDF operations |
| `src/lib/blog/` | Article content and the post registry |
| `src/lib/site.ts` | Brand name, description and canonical origin |
| `src/components/` | Shared UI, including the tool page shell |

Renaming the product means editing `src/lib/site.ts` — the name flows from
there into the header, the footer, page metadata, the document properties
written into every export, and the filename of every download.

## Desktop build

```bash
node generate-icon.js     # writes build/icon.png
npm run electron:build
```
