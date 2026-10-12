// Writes src/i18n/content/en.json: the English source for every translated
// page. Re-run after changing tool copy, then update the other languages.
import { createJiti } from 'jiti';
import { writeFileSync } from 'node:fs';

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
writeFileSync(new URL('../src/i18n/content/en.json', import.meta.url), JSON.stringify(content, null, 2) + '\n');
console.log('wrote en.json:', Object.keys(content.tools).length, 'tools');
