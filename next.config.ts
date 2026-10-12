import type { NextConfig } from "next";

// Vercel builds a normal Next.js app: every page is still prerendered at
// build time, but server routes such as /api/rating can run. The Electron
// desktop app needs plain files in out/, so its scripts set STATIC_EXPORT=1.
//
// Server-only routes are named route.server.ts. In a static export that
// extension is not a page extension, so those routes are simply left out
// (a static export cannot serve POST requests).
//
// Response headers and the 301s for retired blog URLs live in vercel.json,
// which Vercel applies in both modes.
const staticExport = process.env.STATIC_EXPORT === '1';

const nextConfig: NextConfig = {
  ...(staticExport ? { output: 'export' as const } : {}),
  pageExtensions: staticExport ? ['tsx', 'ts'] : ['tsx', 'ts', 'server.ts'],
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
