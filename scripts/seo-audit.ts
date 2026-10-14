import { posts } from '../src/lib/blog';
import { postText } from '../src/lib/blog/types';
import { tools } from '../src/lib/tools-data';
import { getToolSeo } from '../src/lib/tool-seo';

const out: string[] = [];
const rendered = (t: string) => (`${t} | Slate PDF`.length <= 60 ? `${t} | Slate PDF` : t);
for (const t of tools) {
  const s = getToolSeo(t.slug);
  if (!s) { out.push(`TOOL ${t.slug}: no SEO record`); continue; }
  const r = rendered(s.title);
  if (r.length > 60) out.push(`TOOL ${t.slug}: title ${r.length} "${r}"`);
  if (s.description.length > 158 || s.description.length < 120) out.push(`TOOL ${t.slug}: desc ${s.description.length}`);
  if (s.faqs.length < 3) out.push(`TOOL ${t.slug}: ${s.faqs.length} faqs`);
}
for (const p of posts) {
  const r = rendered(p.title);
  const words = postText(p).split(/\s+/).filter(Boolean).length;
  const issues: string[] = [];
  if (r.length > 60) issues.push(`title ${r.length}`);
  if (p.description.length > 158) issues.push(`desc ${p.description.length}`);
  if (words < 700) issues.push(`words ${words}`);
  if (!p.tool) issues.push('no tool');
  const firstH2 = p.blocks.findIndex(b => b.type === 'h2');
  if (issues.length) out.push(`POST ${p.slug}: ${issues.join(', ')}`);
}
console.log(out.join('\n'));
console.log(`tools ${tools.length} posts ${posts.length}`);
