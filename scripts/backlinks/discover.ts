/**
 * Finds pages that could reasonably link to SlatePDF: roundups of free PDF
 * tools, "alternatives to X" lists, privacy-tool resource pages and blogs that
 * accept guest posts in the niche. Then scores each domain's authority.
 */
import { config } from './config';
import { type Prospect, type State, isSuppressed, log } from './store';

/** Pages that list or review tools, which is where a new tool can earn a mention. */
const QUERIES = [
  'best free pdf tools',
  'best free online pdf editor',
  'free pdf tools no upload',
  'pdf tools that work offline in browser',
  'privacy friendly pdf tools',
  'smallpdf alternatives',
  'ilovepdf alternatives',
  'adobe acrobat free alternatives',
  'best free pdf compressor',
  'free pdf merger without watermark',
  'free tools for students pdf',
  'useful free tools for teachers pdf',
  'productivity tools list pdf',
  'privacy tools list',
  'open source and free pdf tools',
  'tools for freelancers free pdf',
  'small business free tools list documents',
  'how to sign a pdf for free',
  'how to redact a pdf for free',
  'remote work tools list documents',
  '"write for us" productivity tools',
  '"write for us" privacy software',
  '"guest post" productivity software',
  'intitle:resources free online tools pdf',
];

/** Sites that will never link to a competing tool, or whose links are user-generated and nofollow. */
const SKIP_DOMAINS = [
  'ilovepdf.com', 'smallpdf.com', 'adobe.com', 'sejda.com', 'pdf24.org', 'sodapdf.com', 'pdf2go.com', 'pdfcandy.com',
  'foxit.com', 'nitro.com', 'nitropdf.com', 'wondershare.com', 'pdfescape.com', 'docfly.com', 'pdffiller.com', 'xodo.com',
  'reddit.com', 'quora.com', 'youtube.com', 'facebook.com', 'x.com', 'twitter.com', 'linkedin.com', 'pinterest.com',
  'medium.com', 'wikipedia.org', 'amazon.com', 'apple.com', 'microsoft.com', 'google.com', 'github.com',
  'stackoverflow.com', 'stackexchange.com', 'tiktok.com', 'instagram.com',
];

const rootDomain = (host: string) => host.replace(/^www\./, '').toLowerCase();

interface SearchHit { url: string; title: string; query: string }

async function braveSearch(query: string): Promise<SearchHit[]> {
  const res = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=20`, {
    headers: { Accept: 'application/json', 'X-Subscription-Token': config.braveApiKey },
  });
  if (!res.ok) throw new Error(`Brave search ${res.status}: ${await res.text()}`);
  const data = await res.json() as { web?: { results?: { url: string; title: string }[] } };
  return (data.web?.results ?? []).map(r => ({ url: r.url, title: r.title, query }));
}

/** Open PageRank: free, 0–10 scale, up to 100 domains per call. */
async function authority(domains: string[]): Promise<Map<string, number>> {
  const scores = new Map<string, number>();
  for (let i = 0; i < domains.length; i += 100) {
    const qs = domains.slice(i, i + 100).map(d => `domains[]=${encodeURIComponent(d)}`).join('&');
    const res = await fetch(`https://openpagerank.com/api/v1.0/getPageRank?${qs}`, { headers: { 'API-OPR': config.openPageRankKey } });
    if (!res.ok) throw new Error(`Open PageRank ${res.status}: ${await res.text()}`);
    const data = await res.json() as { response: { domain: string; page_rank_decimal: number | string; status_code: number }[] };
    for (const r of data.response) scores.set(r.domain, r.status_code === 200 ? Number(r.page_rank_decimal) || 0 : 0);
  }
  return scores;
}

/** Adds up to `wanted` new prospects that pass the authority bar. */
export async function discover(state: State, wanted: number): Promise<number> {
  const known = new Set(state.prospects.map(p => p.domain));
  let added = 0;

  // Fresh queries first; once all are used, cycle again (results shift over time).
  const order = [...QUERIES.filter(q => !state.seenQueries.includes(q)), ...QUERIES.filter(q => state.seenQueries.includes(q))];

  for (const query of order) {
    if (added >= wanted) break;
    let hits: SearchHit[];
    try {
      hits = await braveSearch(query);
    } catch (e) {
      log(`search failed for "${query}": ${(e as Error).message}`);
      continue;
    }
    if (!state.seenQueries.includes(query)) state.seenQueries.push(query);

    const fresh = new Map<string, SearchHit>();
    for (const h of hits) {
      let domain: string;
      try { domain = rootDomain(new URL(h.url).hostname); } catch { continue; }
      if (domain === config.site.host || known.has(domain) || fresh.has(domain)) continue;
      if (SKIP_DOMAINS.some(s => domain === s || domain.endsWith(`.${s}`))) continue;
      if (isSuppressed(state, domain)) continue;
      fresh.set(domain, h);
    }
    if (!fresh.size) continue;

    const scores = await authority([...fresh.keys()]);
    for (const [domain, h] of fresh) {
      const score = scores.get(domain) ?? 0;
      if (score < config.limits.minAuthority) continue;
      const now = new Date().toISOString();
      const p: Prospect = {
        id: `${domain}-${Date.now().toString(36)}`, url: h.url, domain, title: h.title, query,
        authority: score, status: 'found', emails: [], createdAt: now, updatedAt: now,
      };
      state.prospects.push(p);
      known.add(domain);
      added++;
      log(`found ${domain} (authority ${score.toFixed(1)}) via "${query}"`);
      if (added >= wanted) break;
    }
  }
  return added;
}
