# Slate PDF

The PDF toolkit that runs in your browser. Merge, split, compress, convert,
sign, redact and edit PDFs — every operation runs on the user's own machine, so
files never leave the device.

> The one exception is **Translate PDF**, which sends text to a public
> translation service. The tool says so in its own interface.

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
