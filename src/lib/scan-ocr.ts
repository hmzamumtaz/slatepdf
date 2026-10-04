/**
 * On-device text recognition for the phone scanner (Copy text, Business card).
 *
 * Tesseract runs in a Web Worker in this browser tab. The worker script, the
 * WASM core and the language model are fetched from jsDelivr the first time a
 * language is used (then cached by the browser); the scanned image itself is
 * never sent anywhere.
 *
 * Contact extraction (`extractContact`) and vCard writing (`contactToVcf`) are
 * pure, deterministic string functions with no browser dependencies, so they
 * can be unit-tested in Node.
 */

import type Tesseract from 'tesseract.js';

// ---------------------------------------------------------------------------
// OCR
// ---------------------------------------------------------------------------

export interface OcrTextResult {
  /** Recognised text, lines joined with "\n" and paragraphs separated by a blank line. */
  text: string;
  /** Non-empty recognised lines, top to bottom. */
  lines: string[];
  /** Mean confidence reported by Tesseract, 0..100. */
  confidence: number;
}

type TesseractWorker = Tesseract.Worker;

let cachedWorker: TesseractWorker | null = null;
let cachedLang: string | null = null;
let workerPromise: Promise<TesseractWorker> | null = null;
/** Progress sink for the job currently running on the cached worker. */
let activeProgress: ((p: number) => void) | null = null;
/** Serialises jobs so a language switch never terminates a worker mid-job. */
let queue: Promise<unknown> = Promise.resolve();

// Unicode property escapes are built via RegExp() so the ES2017 TS target
// does not reject them; every evergreen browser and Node supports them.
const ALNUM = new RegExp('[\\p{L}\\p{N}]', 'u');
const ALNUM_G = new RegExp('[\\p{L}\\p{N}]', 'gu');

async function getWorker(lang: string): Promise<TesseractWorker> {
  if (cachedWorker && cachedLang === lang) return cachedWorker;
  if (cachedWorker) {
    const old = cachedWorker;
    cachedWorker = null;
    cachedLang = null;
    await old.terminate().catch(() => undefined);
  }
  if (!workerPromise) {
    workerPromise = (async () => {
      const T = await import('tesseract.js');
      const worker = await T.createWorker(lang, undefined, {
        logger: (m: Tesseract.LoggerMessage) => {
          if (m.status === 'recognizing text') activeProgress?.(Math.max(0, Math.min(1, m.progress || 0)));
        },
      });
      // Silence Tesseract's internal diagnostics ("Line cannot be recognized!!").
      await worker.setParameters({ debug_file: '/dev/null' } as Partial<Tesseract.WorkerParams>).catch(() => undefined);
      cachedWorker = worker;
      cachedLang = lang;
      return worker;
    })();
    // Allow a retry (e.g. after coming back online) if creation failed.
    workerPromise.then(
      () => { workerPromise = null; },
      () => { workerPromise = null; },
    );
  }
  return workerPromise;
}

function lineIsJunk(text: string, confidence: number): boolean {
  if (!ALNUM.test(text)) return true;
  // A lone character on its own line is almost always a speck or an edge.
  if (text.replace(/\s/g, '').length < 2) return true;
  const alnum = (text.match(ALNUM_G) || []).length;
  const visible = text.replace(/\s/g, '').length;
  // Low confidence and mostly punctuation: speckles, borders, logo fragments.
  return confidence < 40 && alnum / Math.max(1, visible) < 0.5;
}

function collectLines(page: Tesseract.Page): { text: string; lines: string[] } {
  const lines: string[] = [];
  const paragraphs: string[] = [];
  for (const block of page.blocks || []) {
    for (const para of block.paragraphs || []) {
      const kept: string[] = [];
      for (const line of para.lines || []) {
        // Rebuild the line from its words, dropping low-confidence words and
        // lone symbols (paper edges and texture read as "|" or "~").
        const words = (line.words || []).filter(w => {
          const wt = (w.text || '').trim();
          if (!wt) return false;
          const conf = typeof w.confidence === 'number' ? w.confidence : 100;
          // Real words can score low on small print, so only drop near-certain noise.
          return !(conf < 15 || (!ALNUM.test(wt) && (wt.length <= 2 || conf < 80)));
        });
        const t = (line.words?.length ? words.map(w => w.text.trim()).join(' ') : line.text || '').replace(/\s+/g, ' ').trim();
        if (!t || lineIsJunk(t, line.confidence)) continue;
        kept.push(t);
      }
      if (kept.length) {
        lines.push(...kept);
        paragraphs.push(kept.join('\n'));
      }
    }
  }
  if (!page.blocks) {
    // Fallback when the block tree is unavailable.
    for (const raw of (page.text || '').split(/\r?\n/)) {
      const t = raw.replace(/\s+/g, ' ').trim();
      if (t && ALNUM.test(t)) lines.push(t);
    }
    return { text: lines.join('\n'), lines };
  }
  return { text: paragraphs.join('\n\n'), lines };
}

/**
 * Tesseract reads small text far better at ~30px x-height. Business cards and
 * small crops come out of the scanner only ~1000px wide, so enlarge those.
 */
async function upscaleForOcr(image: Blob): Promise<Blob | HTMLCanvasElement> {
  try {
    const bmp = await createImageBitmap(image);
    const long = Math.max(bmp.width, bmp.height);
    const k = long >= 1600 ? 1 : Math.min(2, 1600 / long);
    // A white margin keeps edge slivers from being read as text lines;
    // Tesseract also prefers some space around text. (Trimming the edges
    // instead was tried: it made layout analysis drop top headings.)
    const inset = 0;
    const sw = bmp.width;
    const sh = bmp.height;
    const margin = 24;
    const c = document.createElement('canvas');
    c.width = Math.round(sw * k) + margin * 2;
    c.height = Math.round(sh * k) + margin * 2;
    const ctx = c.getContext('2d');
    if (!ctx || sw <= 0 || sh <= 0) { bmp.close(); return image; }
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bmp, inset, inset, sw, sh, margin, margin, c.width - margin * 2, c.height - margin * 2);
    bmp.close();
    return c;
  } catch {
    return image;
  }
}

/**
 * Recognise the text in an image on this device. One worker is cached per
 * language; switching language terminates the old one. Calls are queued.
 */
export function recognizeImage(
  image: Blob,
  lang: string,
  onProgress?: (p: number) => void,
): Promise<OcrTextResult> {
  const job = queue.then(async () => {
    const worker = await getWorker(lang);
    activeProgress = onProgress ?? null;
    try {
      onProgress?.(0);
      const input = await upscaleForOcr(image);
      const { data } = await worker.recognize(input, {}, { blocks: true, text: true });
      onProgress?.(1);
      const { text, lines } = collectLines(data);
      return { text, lines, confidence: Math.round(data.confidence || 0) };
    } finally {
      activeProgress = null;
    }
  });
  queue = job.catch(() => undefined);
  return job;
}

/** Terminate the cached worker (if any) and free its memory. Safe to call any time. */
export async function terminateOcr(): Promise<void> {
  const pending = workerPromise;
  await queue;
  if (pending) await pending.catch(() => undefined);
  const w = cachedWorker;
  cachedWorker = null;
  cachedLang = null;
  if (w) await w.terminate().catch(() => undefined);
}

/** A user-facing explanation for a recognition failure. */
export function ocrErrorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err ?? '');
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
  if (offline || /fetch|network|load|importScripts|traineddata|failed to/i.test(msg)) {
    return 'Text recognition needs an internet connection the first time to download the language model.';
  }
  return 'Text recognition failed on this image. Try a sharper, well-lit scan and run it again.';
}

// ---------------------------------------------------------------------------
// Business-card extraction
// ---------------------------------------------------------------------------

export interface Contact {
  name: string;
  title: string;
  company: string;
  phones: string[];
  emails: string[];
  websites: string[];
  address: string;
  notes: string;
}

export function emptyContact(): Contact {
  return { name: '', title: '', company: '', phones: [], emails: [], websites: [], address: '', notes: '' };
}

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;

const TLDS = new Set([
  'com', 'net', 'org', 'edu', 'gov', 'io', 'co', 'ai', 'app', 'dev', 'me', 'info', 'biz', 'tv', 'xyz', 'tech',
  'online', 'site', 'store', 'shop', 'space', 'studio', 'design', 'agency', 'digital', 'media', 'global', 'world',
  'consulting', 'solutions', 'group', 'law', 'health', 'cloud', 'email', 'live', 'pro', 'eu', 'uk', 'us', 'ca',
  'au', 'nz', 'de', 'fr', 'es', 'it', 'nl', 'be', 'ch', 'at', 'se', 'no', 'dk', 'fi', 'ie', 'pl', 'pt', 'cz',
  'gr', 'tr', 'ru', 'ua', 'in', 'pk', 'bd', 'lk', 'ae', 'sa', 'qa', 'kw', 'eg', 'ma', 'ng', 'gh', 'ke', 'za',
  'jp', 'cn', 'hk', 'tw', 'kr', 'sg', 'my', 'id', 'ph', 'th', 'vn', 'br', 'mx', 'ar', 'cl', 'pe',
]);
const URL_RE = /\b(?:https?:\/\/)?(?:www\.)?[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)*\.[A-Za-z]{2,}(?:\/[^\s,;]*)?/g;

// A phone run: optional +/00 country prefix, optional "(", then digits mixed
// with spaces, dots, dashes, slashes and brackets, ending on a digit.
const PHONE_RE = /(?:\+|\b00)?\(?\d[\d\s().\-/]{5,}\d(?:\s*(?:ext\.?|x)\s*\d{1,5})?/gi;

const PHONE_LABELS: { re: RegExp; label: string }[] = [
  { re: /\b(?:fax|f)\b\s*[:.]?/i, label: 'Fax' },
  { re: /\b(?:mob(?:ile)?|cell(?:ular)?|m|c|hp|handy|whatsapp|wa)\b\s*[:.]?/i, label: 'Mobile' },
  { re: /\b(?:home|h)\b\s*[:.]?/i, label: 'Home' },
  { re: /\b(?:tel(?:ephone)?|phone|ph|ph\.|t|p|o|off(?:ice)?|direct|dir|d|work|w|landline)\b\s*[:.]?/i, label: '' },
];

const LABEL_PREFIX = /^(?:e-?mail|email|e|mail|web(?:site)?|w|www|url|site|tel(?:ephone)?|phone|ph|t|p|mob(?:ile)?|m|cell|c|fax|f|direct|d|office|o|address|addr|a|add)\s*[:.]\s*/i;

const COMPANY_SUFFIX = /(?:^|[\s,])(?:ltd\.?|limited|llc|l\.l\.c\.|llp|inc\.?|incorporated|gmbh|ag|plc|pvt\.?|pty\.?|co\.|corp\.?|corporation|company|group|studio|studios|partners|associates|s\.a\.|sa|sas|sarl|s\.r\.l\.|srl|b\.v\.|bv|oy|ab|kg|holdings|industries|enterprises|technologies|solutions|consulting|agency|labs|ventures|capital|foundation|bank|university|clinic|hospital|restaurant|cafe|café|hotel|& co\.?)(?=$|[\s,.)])/i;

const JOB_WORDS = /\b(?:manager|director|engineer|ceo|cto|cfo|coo|cmo|cio|founder|co-founder|cofounder|owner|president|vice|vp|chairman|chair|partner|principal|designer|consultant|sales|officer|head|lead|developer|architect|analyst|specialist|coordinator|executive|assistant|associate|advisor|adviser|accountant|attorney|lawyer|solicitor|barrister|doctor|physician|surgeon|dentist|nurse|therapist|agent|broker|realtor|representative|rep|administrator|admin|supervisor|technician|scientist|researcher|professor|lecturer|teacher|photographer|writer|editor|producer|marketing|strategist|recruiter|intern|secretary|treasurer|chief|senior|junior|managing|general counsel|counsel|programmer|trainer|coach|chef|pharmacist|surveyor|planner|buyer)\b/i;

const STREET_WORDS = /\b(?:street|st\.?|road|rd\.?|avenue|ave\.?|lane|ln\.?|boulevard|blvd\.?|drive|dr\.?|way|court|ct\.?|place|pl\.?|square|sq\.?|terrace|crescent|close|parkway|pkwy\.?|highway|hwy\.?|suite|ste\.?|floor|fl\.?|building|bldg\.?|unit|block|plaza|tower|house|park|estate|industrial|po box|p\.o\. box|strasse|straße|str\.|weg|platz|allee|gasse|calle|avenida|rua|rue|via|viale|piazza|laan|straat|plein|sector|phase|nagar|marg|colony)\b/i;
// Street words glued to the name in German/Dutch/Nordic addresses: "Friedrichstraße 123".
const STREET_SUFFIX = /(?:straße|strasse|str\.|weg|platz|allee|gasse|damm|ufer|straat|laan|gracht|plein|gade|vej|gatan|vägen|veien)(?=$|[\s,.\d])/i;
const UK_POSTCODE = /\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/;
const US_STATE_ZIP = /\b[A-Z]{2}\s+\d{5}(?:-\d{4})?\b/;
const GENERIC_POSTCODE = /(?:^|[\s,])\d{4,6}(?=[\s,]|$)/;
const COUNTRY = /\b(?:usa|u\.s\.a\.|united states|united kingdom|uk|england|scotland|wales|ireland|germany|deutschland|france|spain|españa|italy|italia|netherlands|belgium|switzerland|austria|sweden|norway|denmark|finland|poland|portugal|canada|australia|new zealand|india|pakistan|bangladesh|uae|united arab emirates|saudi arabia|qatar|egypt|nigeria|kenya|south africa|japan|china|singapore|malaysia|indonesia|philippines|brazil|mexico|turkey|türkiye)\b/i;

const HONORIFICS = /^(?:dr|mr|mrs|ms|miss|mx|prof|sir|dame|eng|engr)\.?$/i;
const NAME_SUFFIXES = /^(?:jr|sr|ii|iii|iv|phd|ph\.d|md|mba|esq|cpa|pe|frcs|bsc|msc)\.?$/i;
const NAME_PARTICLES = /^(?:van|von|der|den|de|del|della|di|da|du|la|le|bin|binti|ibn|al|el|ben|mac|st\.?)$/i;

const FREE_MAIL = new Set([
  'gmail', 'googlemail', 'yahoo', 'ymail', 'hotmail', 'outlook', 'live', 'msn', 'icloud', 'me', 'mac', 'aol',
  'proton', 'protonmail', 'pm', 'gmx', 'web', 'mail', 'yandex', 'zoho', 'fastmail', 'hey', 'qq', '163', 'rediffmail',
  // Social/profile hosts are not the person's company.
  'instagram', 'facebook', 'fb', 'linkedin', 'twitter', 'x', 'tiktok', 'youtube', 'youtu', 'github', 'gitlab',
  'behance', 'dribbble', 'medium', 'linktr', 'wa', 't', 'threads', 'pinterest', 'calendly', 'about',
]);

const UPPER_START = new RegExp('^[\\p{Lu}\\p{Lo}]', 'u');
const NAME_TOKEN = new RegExp("^[\\p{L}][\\p{L}\\p{M}'’.\\-]*,?$", 'u');

/** Placeholder left where an email/URL/phone was cut out of a line. */
const HOLE = '\u0000';
const HOLE_G = /\u0000/g;
const LABEL_BEFORE_HOLE = /(?:^|[\s,;])(?:e-?mail|email|e|mail|web(?:site)?|w|www|url|site|tel(?:ephone)?|phone|ph|t|p|o|mob(?:ile)?|m|cell(?:ular)?|c|hp|fax|f|direct|dir|d|office|off|home|h|work|whatsapp|wa)\s*[:.]?\s*(?=\u0000)/gi;

function cleanLine(s: string): string {
  return s
    .replace(/\s*@\s*/g, '@') // OCR often spaces around "@"
    .replace(/[|•·]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasMeaningfulText(s: string): boolean {
  const stripped = s.replace(/[\s:;,.\-–—|/\\()[\]{}'"+*#_]+/g, '');
  return stripped.length >= 2 && ALNUM.test(stripped);
}

function digitsOf(s: string): string {
  return s.replace(/\D/g, '');
}

function tidyPhone(raw: string): string {
  return raw.replace(/\s+/g, ' ').replace(/^[\s(]+(?=\+)/, '').replace(/[\s.\-/]+$/, '').trim();
}

function isLikelyPhone(raw: string): boolean {
  const d = digitsOf(raw.replace(/(?:ext\.?|x)\s*\d+$/i, ''));
  if (d.length < 7 || d.length > 15) return false;
  if (/^\d{5}-\d{4}$/.test(raw.trim())) return false; // US ZIP+4
  if (/^\d{1,2}[./-]\d{1,2}[./-]\d{2,4}$/.test(raw.trim())) return false; // date
  return true;
}

function titleCaseIfShouting(s: string): string {
  if (s !== s.toUpperCase() || s === s.toLowerCase()) return s;
  return s
    .toLowerCase()
    .replace(new RegExp("(^|[\\s\\-'’])(\\p{L})", 'gu'), (_m, sep: string, ch: string) => sep + ch.toUpperCase());
}

function nameScore(line: string, index: number, emailLocals: string[]): number {
  if (/[\d@]/.test(line) || line.includes('/') || line.length > 40) return -1;
  const tokens = line.split(/\s+/).filter(Boolean);
  const core = tokens.filter(t => !HONORIFICS.test(t) && !NAME_SUFFIXES.test(t.replace(/,$/, '')));
  const coreText = core.join(' ');
  if (COMPANY_SUFFIX.test(coreText) || JOB_WORDS.test(coreText) || STREET_WORDS.test(coreText) || COUNTRY.test(coreText)) return -1;
  if (core.length < 2 || core.length > 4) return -1;
  for (const t of core) {
    if (!NAME_TOKEN.test(t)) return -1;
    if (!UPPER_START.test(t) && !NAME_PARTICLES.test(t)) return -1;
  }
  let score = 10 - index * 1.5;
  if (core.length === 2 || core.length === 3) score += 2;
  const lowerTokens = core.map(t => t.toLowerCase().replace(/[^a-z]/g, '')).filter(t => t.length > 1);
  for (const local of emailLocals) {
    const hits = lowerTokens.filter(t => local.includes(t)).length;
    if (hits >= 2) score += 8;
    else if (hits === 1) score += 4;
    else if (lowerTokens.length >= 2 && local.startsWith(lowerTokens[0][0]) && local.includes(lowerTokens[lowerTokens.length - 1])) score += 4;
  }
  return score;
}

function isStrongAddress(line: string): boolean {
  if (/\b(?:p\.?\s?o\.?\s?box)\b/i.test(line)) return true;
  if ((STREET_WORDS.test(line) || STREET_SUFFIX.test(line)) && /\d/.test(line)) return true;
  if (UK_POSTCODE.test(line) || US_STATE_ZIP.test(line)) return true;
  return false;
}

function isWeakAddress(line: string): boolean {
  if (isStrongAddress(line) || COUNTRY.test(line)) return true;
  // "10115 Berlin", "Mumbai 400001", "75008 Paris, France"
  return GENERIC_POSTCODE.test(line) && /[A-Za-z]{3,}/.test(line);
}

/**
 * Pull structured contact details out of OCR text from a business card.
 * Purely heuristic and deterministic; every field is meant to be reviewed.
 */
export function extractContact(text: string): Contact {
  const contact = emptyContact();
  const lines = text.split(/\r?\n/).map(cleanLine).filter(Boolean);
  const rest: string[] = []; // each line with emails/urls/phones/labels removed
  const faxNotes: string[] = [];

  const seenPhones = new Set<string>();
  const addEmail = (e: string) => {
    const v = e.replace(/[.,;:]+$/, '').toLowerCase();
    if (!contact.emails.includes(v)) contact.emails.push(v);
  };
  const addSite = (u: string) => {
    const v = u.replace(/[.,;:)]+$/, '');
    const key = v.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
    if (!contact.websites.some(w => w.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '') === key)) {
      contact.websites.push(v);
    }
  };

  for (const line of lines) {
    let work = line;

    // Emails
    work = work.replace(EMAIL_RE, m => { addEmail(m); return HOLE; });

    // Websites (require a scheme, "www." or a known TLD to avoid "Co." / "St.")
    work = work.replace(URL_RE, (m, offset: number, whole: string) => {
      if (whole[offset - 1] === '@') return m;
      const host = m.replace(/^https?:\/\//i, '').split('/')[0];
      const tld = host.split('.').pop()!.toLowerCase();
      const explicit = /^(?:https?:\/\/|www\.)/i.test(m);
      if (!explicit && (!TLDS.has(tld) || /^\d+(?:\.\d+)+$/.test(host) || host.split('.')[0].length < 2)) return m;
      addSite(m);
      return HOLE;
    });

    // Phones, keeping a type label when the card states one.
    work = work.replace(PHONE_RE, (m, offset: number, whole: string) => {
      if (!isLikelyPhone(m)) return m;
      const before = whole.slice(Math.max(0, offset - 14), offset);
      let label = '';
      for (const { re, label: l } of PHONE_LABELS) {
        const anchored = new RegExp(`(?:^|[\\s,;|])(?:${re.source})\\s*$`, 'i');
        if (anchored.test(before)) { label = l; break; }
      }
      const num = tidyPhone(m);
      const key = digitsOf(num);
      if (seenPhones.has(key)) return HOLE;
      seenPhones.add(key);
      if (label === 'Fax') faxNotes.push(`Fax: ${num}`);
      else contact.phones.push(label ? `${label}: ${num}` : num);
      return HOLE;
    });

    // Remove the labels ("T:", "Mob.", "E:") that introduced what was just extracted.
    work = work
      .replace(LABEL_BEFORE_HOLE, ' ')
      .replace(HOLE_G, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    rest.push(hasMeaningfulText(work) ? work.replace(LABEL_PREFIX, '').replace(/^[,;:\-–—\s]+|[,;:\-–—\s]+$/g, '') : '');
  }

  const used = rest.map(r => !r);

  // Name: most name-like line, biased to the top and to the email local part.
  const emailLocals = contact.emails.map(e => e.split('@')[0].toLowerCase());
  let bestIdx = -1;
  let bestScore = 0;
  rest.forEach((r, i) => {
    if (!r || i > 7) return;
    const s = nameScore(r, i, emailLocals);
    if (s > bestScore) { bestScore = s; bestIdx = i; }
  });
  if (bestIdx >= 0) {
    contact.name = titleCaseIfShouting(rest[bestIdx].replace(/,$/, ''));
    used[bestIdx] = true;
  }

  // Company: legal/business suffix first.
  const companyIdx = rest.findIndex((r, i) => !used[i] && COMPANY_SUFFIX.test(r) && !STREET_WORDS.test(r) && r.length <= 60);
  if (companyIdx >= 0) {
    contact.company = rest[companyIdx];
    used[companyIdx] = true;
  }

  // Title: common job words.
  const titleIdx = rest.findIndex((r, i) => !used[i] && JOB_WORDS.test(r) && !/@/.test(r) && r.length <= 70);
  if (titleIdx >= 0) {
    let title = rest[titleIdx];
    used[titleIdx] = true;
    // "Head of Sales | Acme Ltd" or "Director, Acme Ltd" on one line.
    const parts = title.split(/\s+(?:at|@)\s+|\s*[,|–—]\s*/i).map(p => p.trim()).filter(Boolean);
    if (!contact.company && parts.length === 2 && COMPANY_SUFFIX.test(parts[1])) {
      title = parts[0];
      contact.company = parts[1];
    }
    contact.title = title;
    // A second job-word line right below ("Marketing & Communications") continues the title.
    const next = titleIdx + 1;
    if (next < rest.length && !used[next] && rest[next] && JOB_WORDS.test(rest[next]) && !isStrongAddress(rest[next]) && rest[next].length <= 50) {
      contact.title += `, ${rest[next]}`;
      used[next] = true;
    }
  }

  // Address: strong street/postcode lines plus adjacent city/country lines.
  const addrIdx = new Set<number>();
  rest.forEach((r, i) => { if (r && !used[i] && isStrongAddress(r)) addrIdx.add(i); });
  let grew = true;
  while (grew) {
    grew = false;
    for (const i of [...addrIdx]) {
      for (const j of [i - 1, i + 1]) {
        if (j < 0 || j >= rest.length || addrIdx.has(j) || used[j] || !rest[j]) continue;
        if (isWeakAddress(rest[j])) { addrIdx.add(j); grew = true; }
      }
    }
  }
  if (addrIdx.size === 0) {
    // No street line: accept a lone "City Postcode, Country" style line.
    rest.forEach((r, i) => { if (r && !used[i] && GENERIC_POSTCODE.test(r) && COUNTRY.test(r)) addrIdx.add(i); });
  }
  const addrOrder = [...addrIdx].sort((a, b) => a - b);
  contact.address = addrOrder.map(i => rest[i]).join(', ').replace(/,\s*,/g, ',');
  addrOrder.forEach(i => { used[i] = true; });

  // Company fallback: the business email/website domain.
  if (!contact.company) {
    const domains = [
      ...contact.emails.map(e => e.split('@')[1]),
      ...contact.websites.map(w => w.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0]),
    ];
    for (const d of domains) {
      const label = d.toLowerCase().split('.')[0];
      if (!label || FREE_MAIL.has(label)) continue;
      // Prefer a card line that spells the domain ("Northwind Traders" for
      // northwindtraders.com); the fullest such line wins over a bare logo word.
      const norm = (r: string) => r.toLowerCase().replace(/[^a-z0-9]/g, '');
      const candidates = rest
        .map((r, i) => ({ r, i }))
        .filter(({ r, i }) => !used[i] && r && !/\d/.test(r) && r.length <= 50 && norm(r).includes(label));
      if (candidates.length) {
        const best = candidates.reduce((a, b) => (b.r.length > a.r.length ? b : a));
        contact.company = best.r;
        for (const { r, i } of candidates) if (i === best.i || norm(r) === label) used[i] = true;
      } else {
        contact.company = label
          .split('-')
          .map(w => (w.length <= 3 ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1)))
          .join(' ');
      }
      break;
    }
  }

  // Leftover fragments under 3 letters/digits are OCR specks, not notes.
  const notes = rest.filter((r, i) => !used[i] && r && (r.match(/[\p{L}\p{N}]/gu) || []).length >= 3);
  contact.notes = [...notes, ...faxNotes].join('\n');
  return contact;
}

// ---------------------------------------------------------------------------
// vCard 3.0
// ---------------------------------------------------------------------------

function vEscape(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

const encoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;
function byteLen(s: string): number {
  return encoder ? encoder.encode(s).length : s.length;
}

/** Fold a content line at 75 octets (RFC 2425/6350), never splitting a character. */
function fold(line: string): string {
  if (byteLen(line) <= 75) return line;
  const out: string[] = [];
  let cur = '';
  let limit = 75;
  for (const ch of Array.from(line)) {
    if (byteLen(cur + ch) > limit) {
      // Keep an escape sequence ("\\n", "\\,") on one physical line for lenient parsers.
      let carry = '';
      if (cur.endsWith('\\') && !cur.endsWith('\\\\')) { carry = '\\'; cur = cur.slice(0, -1); }
      out.push(cur);
      cur = carry;
      limit = 74; // continuation lines start with a space
    }
    cur += ch;
  }
  if (cur) out.push(cur);
  return out.join('\r\n ');
}

const PHONE_TYPE: Record<string, string> = {
  mobile: 'CELL,VOICE', cell: 'CELL,VOICE', fax: 'WORK,FAX', home: 'HOME,VOICE', work: 'WORK,VOICE',
};

function splitName(full: string): { family: string; given: string; middle: string; prefix: string; suffix: string } {
  const tokens = full.replace(/,/g, ' ').split(/\s+/).filter(Boolean);
  const prefix: string[] = [];
  const suffix: string[] = [];
  while (tokens.length > 1 && HONORIFICS.test(tokens[0])) prefix.push(tokens.shift()!);
  while (tokens.length > 1 && NAME_SUFFIXES.test(tokens[tokens.length - 1])) suffix.unshift(tokens.pop()!);
  if (tokens.length === 0) return { family: '', given: '', middle: '', prefix: prefix.join(' '), suffix: suffix.join(' ') };
  if (tokens.length === 1) return { family: '', given: tokens[0], middle: '', prefix: prefix.join(' '), suffix: suffix.join(' ') };
  // Keep particles with the family name: "Ludwig van Beethoven" -> family "van Beethoven".
  let familyStart = tokens.length - 1;
  while (familyStart > 1 && NAME_PARTICLES.test(tokens[familyStart - 1])) familyStart--;
  return {
    given: tokens[0],
    middle: tokens.slice(1, familyStart).join(' '),
    family: tokens.slice(familyStart).join(' '),
    prefix: prefix.join(' '),
    suffix: suffix.join(' '),
  };
}

/** Serialise a contact as a vCard 3.0 string with CRLF line endings. */
export function contactToVcf(c: Contact): string {
  const name = c.name.trim();
  const company = c.company.trim();
  const fn = name || company || c.emails[0] || c.phones[0] || 'Unnamed contact';
  const n = splitName(name);
  const lines: string[] = ['BEGIN:VCARD', 'VERSION:3.0'];
  lines.push(`N:${[n.family, n.given, n.middle, n.prefix, n.suffix].map(vEscape).join(';')}`);
  lines.push(`FN:${vEscape(fn)}`);
  if (company) lines.push(`ORG:${vEscape(company)}`);
  if (c.title.trim()) lines.push(`TITLE:${vEscape(c.title.trim())}`);
  for (const raw of c.phones) {
    const p = raw.trim();
    if (!p) continue;
    const m = /^([A-Za-z]+)\s*:\s*(.+)$/.exec(p);
    const type = m ? PHONE_TYPE[m[1].toLowerCase()] ?? 'VOICE' : 'VOICE';
    const num = m ? m[2] : p;
    lines.push(`TEL;TYPE=${type}:${vEscape(num.trim())}`);
  }
  for (const e of c.emails) if (e.trim()) lines.push(`EMAIL;TYPE=INTERNET:${vEscape(e.trim())}`);
  for (const w of c.websites) {
    const u = w.trim();
    if (!u) continue;
    lines.push(`URL:${vEscape(/^https?:\/\//i.test(u) ? u : `https://${u}`)}`);
  }
  if (c.address.trim()) {
    // Whole address in the street component: splitting free text into
    // city/region/postcode would guess wrong more often than it helps.
    lines.push(`ADR;TYPE=WORK:;;${vEscape(c.address.trim())};;;;`);
  }
  if (c.notes.trim()) lines.push(`NOTE:${vEscape(c.notes.trim())}`);
  lines.push('END:VCARD');
  return lines.map(fold).join('\r\n') + '\r\n';
}

/** Plain-text rendering of a contact, for copy/share. */
export function contactToText(c: Contact): string {
  const out: string[] = [];
  if (c.name) out.push(c.name);
  if (c.title) out.push(c.title);
  if (c.company) out.push(c.company);
  for (const p of c.phones) if (p.trim()) out.push(/^[A-Za-z]+\s*:/.test(p) ? p.trim() : `Phone: ${p.trim()}`);
  for (const e of c.emails) if (e.trim()) out.push(`Email: ${e.trim()}`);
  for (const w of c.websites) if (w.trim()) out.push(`Web: ${w.trim()}`);
  if (c.address) out.push(`Address: ${c.address}`);
  if (c.notes) out.push('', c.notes);
  return out.join('\n').trim();
}

// ---------------------------------------------------------------------------
// Small browser helpers shared by the Copy text / Business card sheets
// ---------------------------------------------------------------------------

/** Trigger a download of `blob` as `filename`, then release the object URL. */
export function saveFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Give the browser time to start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/** A filesystem-safe base name ("Sarah J. Thompson" -> "Sarah J Thompson"). */
export function safeBaseName(s: string, fallback: string): string {
  const cleaned = s
    .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ')
    .replace(/[.\s]+/g, ' ')
    .trim()
    .slice(0, 60)
    .trim();
  return cleaned || fallback;
}

/**
 * Copy text to the clipboard. Falls back to selecting `fallbackField` and
 * using execCommand('copy') where the async Clipboard API is unavailable
 * (older iOS, non-secure contexts). Returns whether the copy succeeded.
 */
export async function copyText(text: string, fallbackField?: HTMLTextAreaElement | null): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the legacy path
  }
  let field = fallbackField ?? null;
  let temp: HTMLTextAreaElement | null = null;
  if (!field || field.value !== text) {
    temp = document.createElement('textarea');
    temp.value = text;
    temp.setAttribute('readonly', '');
    temp.style.position = 'fixed';
    temp.style.opacity = '0';
    temp.style.top = '0';
    document.body.appendChild(temp);
    field = temp;
  }
  try {
    field.focus();
    field.select();
    field.setSelectionRange(0, text.length);
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    temp?.remove();
  }
}
