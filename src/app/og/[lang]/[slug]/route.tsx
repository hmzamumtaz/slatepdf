import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { tools } from '@/lib/tools-data';
import { SITE_NAME } from '@/lib/site';
import { DEFAULT_LOCALE, type AnyLocale } from '@/i18n/config';
import { IMAGE_LOCALES } from '@/i18n/og';
import { getContent, toolContent } from '@/i18n/content';

/**
 * Per-tool social preview images (1200×630), rendered once at build time.
 * Languages whose script the renderer cannot shape (Arabic) use the English
 * image — see src/i18n/og.ts.
 */
export const dynamic = 'force-static';
export const dynamicParams = false;

export function generateStaticParams() {
  return IMAGE_LOCALES.flatMap(lang => tools.map(t => ({ lang, slug: t.slug })));
}

// DejaVu Sans Bold (already shipped for PDF text) covers Latin and Cyrillic.
const fontData = readFile(join(process.cwd(), 'public/fonts/unicode-sans-bold.ttf'));

export async function GET(_request: Request, { params }: { params: Promise<{ lang: string; slug: string }> }) {
  const { lang, slug } = await params;
  const tool = tools.find(t => t.slug === slug)!;
  const content = await getContent((IMAGE_LOCALES.includes(lang as AnyLocale) ? lang : DEFAULT_LOCALE) as AnyLocale);
  const local = toolContent(content, slug);

  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#ffffff', padding: '72px 80px', fontFamily: 'Sans' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: '#09090b', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 30 }}>S</div>
          <div style={{ fontSize: 34, color: '#09090b' }}>{SITE_NAME}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <div style={{ width: 96, height: 10, borderRadius: 5, background: tool.color }} />
          <div style={{ fontSize: 84, color: '#09090b', lineHeight: 1.05 }}>{local.name}</div>
          <div style={{ fontSize: 34, color: '#52525b', lineHeight: 1.3, maxWidth: 1000 }}>{local.description}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 28, color: '#166534' }}>
          <div style={{ width: 16, height: 16, borderRadius: 8, background: '#22c55e' }} />
          {content.site.heroBadge}
        </div>
      </div>
    ),
    { width: 1200, height: 630, fonts: [{ name: 'Sans', data: await fontData, style: 'normal', weight: 700 }] },
  );
}
