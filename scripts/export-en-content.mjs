// Writes src/i18n/content/en.json: the English source for every translated
// page. Re-run after changing tool copy, then update the other languages.
// With --check it only verifies en.json is up to date (exit 1 if not).
import { createJiti } from 'jiti';
import { readFileSync, writeFileSync } from 'node:fs';

const jiti = createJiti(import.meta.url, { alias: { '@': new URL('../src', import.meta.url).pathname } });
const { tools, categories, categoryBlurbs } = await jiti.import('../src/lib/tools-data.ts');
const { getToolSeo } = await jiti.import('../src/lib/tool-seo.ts');
const { getToolHowTo } = await jiti.import('../src/lib/tool-howto.ts');
const { site } = await jiti.import('../src/i18n/site-en.ts');

const content = {
  site,
  categories: Object.fromEntries(categories.map(c => [c, { name: c, blurb: categoryBlurbs[c] }])),
  tools: Object.fromEntries(tools.map(t => {
    const seo = getToolSeo(t.slug);
    return [t.slug, {
      slug: t.slug,
      name: t.name,
      description: t.description,
      seoTitle: seo.title,
      metaDescription: seo.description,
      faqs: seo.faqs,
      howTo: getToolHowTo(t.slug),
    }];
  })),
};
const target = new URL('../src/i18n/content/en.json', import.meta.url);
const json = JSON.stringify(content, null, 2) + '\n';
if (process.argv.includes('--check')) {
  if (readFileSync(target, 'utf8') !== json) {
    console.error('src/i18n/content/en.json is out of date: run node scripts/export-en-content.mjs, then update every language.');
    process.exit(1);
  }
  console.log('en.json is up to date');
} else {
  writeFileSync(target, json);
  console.log('wrote en.json:', Object.keys(content.tools).length, 'tools');
}
