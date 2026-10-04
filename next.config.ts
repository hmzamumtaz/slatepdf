import type { NextConfig } from "next";

// Static export: Next ignores headers()/redirects() here. Response headers and
// the 301s for retired blog URLs live in vercel.json, which Vercel applies.
const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
