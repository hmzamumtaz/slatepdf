import { posts } from '../src/lib/blog';
import { postText } from '../src/lib/blog/types';
import { tools } from '../src/lib/tools-data';

const slugs = new Set<string>();
const dupes: string[] = [];
for (const p of posts) { if (slugs.has(p.slug)) dupes.push(p.slug); slugs.add(p.slug); }

const toolSlugs = new Set(tools.map(t => t.slug));
const problems: string[] = [];

if (dupes.length) problems.push(`Duplicate slugs: ${dupes.join(', ')}`);

const titles = new Map<string, number>();
const descs = new Map<string, number>();

for (const p of posts) {
  const words = postText(p).split(/\s+/).filter(Boolean).length;
  if (words < 450) problems.push(`${p.slug}: only ${words} words`);
  if (p.description.length < 110 || p.description.length > 175) problems.push(`${p.slug}: description ${p.description.length} chars`);
  if (p.title.length > 75) problems.push(`${p.slug}: title ${p.title.length} chars`);
  if (p.tool && !toolSlugs.has(p.tool)) problems.push(`${p.slug}: unknown tool "${p.tool}"`);
  if (p.faqs.length < 3) problems.push(`${p.slug}: only ${p.faqs.length} FAQs`);
  if (p.blocks.filter(b => b.type === 'h2').length < 3) problems.push(`${p.slug}: fewer than 3 H2s`);
  for (const r of p.related ?? []) if (!posts.some(q => q.slug === r)) problems.push(`${p.slug}: related "${r}" does not exist`);
  titles.set(p.title, (titles.get(p.title) ?? 0) + 1);
  descs.set(p.description, (descs.get(p.description) ?? 0) + 1);
}
for (const [t, n] of titles) if (n > 1) problems.push(`Duplicate title: ${t}`);
for (const [d, n] of descs) if (n > 1) problems.push(`Duplicate description: ${d.slice(0, 50)}`);

const wordCounts = posts.map(p => postText(p).split(/\s+/).filter(Boolean).length);
console.log(`Posts: ${posts.length}`);
console.log(`Words: total ${wordCounts.reduce((a, b) => a + b, 0)}, min ${Math.min(...wordCounts)}, max ${Math.max(...wordCounts)}, avg ${Math.round(wordCounts.reduce((a, b) => a + b, 0) / posts.length)}`);
const cats = new Map<string, number>();
for (const p of posts) cats.set(p.category, (cats.get(p.category) ?? 0) + 1);
console.log('Categories:', [...cats].map(([c, n]) => `${c}=${n}`).join(', '));
const withTool = posts.filter(p => p.tool).length;
console.log(`Linked to a tool: ${withTool}/${posts.length}`);
const coveredTools = new Set(posts.map(p => p.tool).filter(Boolean));
console.log(`Tools referenced: ${coveredTools.size}/${tools.length}`);
console.log(problems.length ? `\nPROBLEMS (${problems.length}):\n` + problems.join('\n') : '\nNo problems found.');
