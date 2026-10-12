#!/usr/bin/env node
// Keeps translations complete and consistent.
//
//   node scripts/check-i18n.mjs --write-en   re-extract English UI strings
//   node scripts/check-i18n.mjs              check every language (CI-safe)
//
// UI strings: every t('…') / msg('…') call with a literal first argument is
// collected per namespace into src/i18n/ui/en/<ns>.json. Each language needs
// src/i18n/ui/<locale>/<ns>.json with every key and the same {placeholders}.
//
// Page content: src/i18n/content/<locale>.json must mirror content/en.json
// (same keys, same list lengths, same placeholders). Translated tool slugs
// are collected into src/i18n/slugs.generated.ts.
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const SRC = join(ROOT, 'src');
const I18N = join(SRC, 'i18n');
const LOCALES = ['es', 'pt', 'fr', 'de', 'it', 'id', 'ru', 'ar'];
const LATIN_SLUG_LOCALES = new Set(['es', 'pt', 'fr', 'de', 'it', 'id']);

// Which namespace a source file's strings belong to. First match wins.
const NAMESPACE_RULES = [
  [/^components\/tools\/scan\//, 'scan'],
  [/^components\/workspace\//, 'workspace'],
  [/^components\/PdfEditor\.tsx$/, 'editor'],
  [/^components\/tools\/(\w+)Tool\.tsx$/, (m) => toolSlugFromComponent(m[1])],
  [/^components\/(ToolPage|FileUpload|LivePreviewModal|PdfPreview|RateTool)\.tsx$/, 'common'],
  [/^lib\//, 'common'],
];

const COMPONENT_SLUGS = {
  AiSummarizer: 'ai-summarizer', PdfToPdfA: 'pdf-to-pdfa', PdfWorkspace: 'pdf-workspace',
  PowerPointToPdf: 'powerpoint-to-pdf', PdfToPowerPoint: 'pdf-to-powerpoint',
};
function toolSlugFromComponent(name) {
  return COMPONENT_SLUGS[name] ?? name.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx?|mts)$/.test(name)) out.push(p);
  }
  return out;
}

function namespaceFor(rel) {
  for (const [re, ns] of NAMESPACE_RULES) {
    const m = rel.match(re);
    if (m) return typeof ns === 'function' ? ns(m) : ns;
  }
  return null;
}

// t('…'), t("…"), t(`…`) without ${}, and msg(…) — first argument only.
const CALL = /(?<![\w.])(?:t|msg)\(\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"|`((?:[^`\\$]|\\.)*)`)/g;

function unescape(s) {
  return s.replace(/\\(['"`\\])/g, '$1').replace(/\\n/g, '\n');
}

function extract() {
  const byNs = {};
  const problems = [];
  for (const file of walk(SRC)) {
    const rel = relative(SRC, file);
    if (rel.startsWith('i18n/')) continue;
    const code = readFileSync(file, 'utf8');
    if (!/(?<![\w.])(?:t|msg)\(/.test(code)) continue;
    const ns = namespaceFor(rel);
    for (const m of code.matchAll(CALL)) {
      const key = unescape(m[1] ?? m[2] ?? m[3]);
      if (!ns) { problems.push(`${rel}: t() used in a file with no namespace rule`); break; }
      (byNs[ns] ??= new Set()).add(key);
    }
    // A template literal with ${} as t()'s argument can never be translated.
    for (const m of code.matchAll(/(?<![\w.])t\(\s*`[^`]*\$\{/g)) {
      problems.push(`${rel}: t() with a \${} template — use a {placeholder} instead (${m[0].slice(0, 40)}…)`);
    }
  }
  return { byNs, problems };
}

const placeholders = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort().join(',');

function compareContent(en, other, path, errors) {
  if (Array.isArray(en)) {
    if (!Array.isArray(other)) return errors.push(`${path}: expected a list`);
    if (en.length !== other.length) errors.push(`${path}: ${other.length} items, English has ${en.length}`);
    en.forEach((v, i) => compareContent(v, other[i], `${path}[${i}]`, errors));
  } else if (en && typeof en === 'object') {
    if (!other || typeof other !== 'object') return errors.push(`${path}: expected an object`);
    for (const k of Object.keys(en)) {
      if (!(k in other)) errors.push(`${path}.${k}: missing`);
      else compareContent(en[k], other[k], `${path}.${k}`, errors);
    }
    for (const k of Object.keys(other)) if (!(k in en)) errors.push(`${path}.${k}: not in English`);
  } else if (typeof en === 'string') {
    if (typeof other !== 'string' || !other.trim()) errors.push(`${path}: empty or not text`);
    else if (placeholders(en) !== placeholders(other)) errors.push(`${path}: placeholders {${placeholders(other)}} ≠ English {${placeholders(en)}}`);
  }
}

const writeEn = process.argv.includes('--write-en');
const errors = [];
const { byNs, problems } = extract();
errors.push(...problems);

const uiEnDir = join(I18N, 'ui', 'en');
if (writeEn) {
  mkdirSync(uiEnDir, { recursive: true });
  for (const [ns, keys] of Object.entries(byNs)) {
    const obj = Object.fromEntries([...keys].sort().map(k => [k, k]));
    writeFileSync(join(uiEnDir, `${ns}.json`), JSON.stringify(obj, null, 2) + '\n');
  }
  console.log('Wrote English UI dictionaries:', Object.entries(byNs).map(([n, k]) => `${n} (${k.size})`).join(', '));
} else {
  for (const [ns, keys] of Object.entries(byNs)) {
    const file = join(uiEnDir, `${ns}.json`);
    const en = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
    for (const k of keys) if (!(k in en)) errors.push(`ui/en/${ns}.json: missing "${k}" — run with --write-en`);
  }
}

// UI dictionaries per language.
const enNamespaces = existsSync(uiEnDir) ? readdirSync(uiEnDir).filter(f => f.endsWith('.json')) : [];
let uiTotals = {};
for (const locale of LOCALES) {
  let done = 0, total = 0;
  for (const f of enNamespaces) {
    const en = JSON.parse(readFileSync(join(uiEnDir, f), 'utf8'));
    const file = join(I18N, 'ui', locale, f);
    const tr = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
    for (const k of Object.keys(en)) {
      total++;
      if (typeof tr[k] !== 'string' || !tr[k].trim()) { errors.push(`ui/${locale}/${f}: missing "${k.slice(0, 60)}"`); continue; }
      if (placeholders(k) !== placeholders(tr[k])) { errors.push(`ui/${locale}/${f}: placeholders differ for "${k.slice(0, 60)}"`); continue; }
      done++;
    }
  }
  uiTotals[locale] = `${done}/${total}`;
}

// Page content per language, and the slug map.
const enContent = JSON.parse(readFileSync(join(I18N, 'content', 'en.json'), 'utf8'));
const slugs = {};
for (const locale of LOCALES) {
  const file = join(I18N, 'content', `${locale}.json`);
  if (!existsSync(file)) { errors.push(`content/${locale}.json: missing`); slugs[locale] = {}; continue; }
  const content = JSON.parse(readFileSync(file, 'utf8'));
  compareContent(enContent, content, `content/${locale}`, errors);
  const seen = new Map();
  slugs[locale] = {};
  for (const [slug, tool] of Object.entries(content.tools ?? {})) {
    const s = tool.slug;
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(s ?? '')) errors.push(`content/${locale}: tools.${slug}.slug "${s}" must be lowercase a-z, 0-9 and hyphens`);
    if (s === 'tools') errors.push(`content/${locale}: tools.${slug}.slug cannot be "tools"`);
    if (!LATIN_SLUG_LOCALES.has(locale) && s !== slug) errors.push(`content/${locale}: tools.${slug}.slug should stay "${slug}" (non-Latin script)`);
    if (seen.has(s)) errors.push(`content/${locale}: slug "${s}" used by both ${seen.get(s)} and ${slug}`);
    seen.set(s, slug);
    slugs[locale][slug] = s;
  }
}

const generated = `// Generated by scripts/check-i18n.mjs from src/i18n/content/<locale>.json. Do not edit.
export const LOCALIZED_SLUGS: Record<string, Record<string, string>> = ${JSON.stringify(slugs, null, 2)};
`;
const genFile = join(I18N, 'slugs.generated.ts');
if (!existsSync(genFile) || readFileSync(genFile, 'utf8') !== generated) {
  writeFileSync(genFile, generated);
  console.log('Updated src/i18n/slugs.generated.ts');
}

console.log('UI strings translated:', Object.entries(uiTotals).map(([l, v]) => `${l} ${v}`).join(', '));
if (errors.length) {
  console.error(`\n${errors.length} problem(s):`);
  for (const e of errors.slice(0, 80)) console.error('  ' + e);
  if (errors.length > 80) console.error(`  … and ${errors.length - 80} more`);
  process.exit(1);
}
console.log('i18n OK');
