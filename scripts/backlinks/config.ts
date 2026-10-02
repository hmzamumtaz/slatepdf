/**
 * Settings for the backlink outreach system. Everything secret comes from
 * `.env.backlinks` (gitignored) so nothing sensitive is committed.
 * See scripts/backlinks/README.md for what each variable does.
 */
import fs from 'node:fs';
import path from 'node:path';
import { SITE_NAME, SITE_URL, SITE_DESCRIPTION } from '../../src/lib/site';
import { tools } from '../../src/lib/tools-data';

const ENV_FILE = path.resolve('.env.backlinks');

/** Minimal .env reader so the system needs no extra dependency for it. */
function loadEnvFile() {
  if (!fs.existsSync(ENV_FILE)) return;
  for (const line of fs.readFileSync(ENV_FILE, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m || process.env[m[1]] !== undefined) continue;
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
loadEnvFile();

const env = (key: string, fallback = '') => process.env[key] ?? fallback;
const num = (key: string, fallback: number) => {
  const v = Number(process.env[key]);
  return Number.isFinite(v) && process.env[key] !== '' && process.env[key] !== undefined ? v : fallback;
};

export const config = {
  stateDir: path.resolve('.backlinks'),

  site: {
    name: SITE_NAME,
    url: SITE_URL,
    host: new URL(SITE_URL).hostname,
    description: SITE_DESCRIPTION,
    // The pitch every email is built on. Keep it honest: these are the claims
    // site owners will check before they link.
    facts: [
      'Free, no account or sign-up needed',
      'The PDF tools run in the browser, so files are processed on the visitor\'s own device instead of being uploaded to a server',
      'Works offline once the page has loaded',
      `${tools.length} tools, including merge, split, compress, convert, sign, redact, OCR and edit`,
    ],
    pages: tools.map(t => ({ name: t.name, url: `${SITE_URL}/tools/${t.slug}`, description: t.description })),
  },

  sender: {
    name: env('SENDER_NAME'),
    email: env('SENDER_EMAIL'),
    // CAN-SPAM requires a valid postal address in commercial email.
    postalAddress: env('SENDER_POSTAL_ADDRESS'),
  },

  smtp: {
    host: env('SMTP_HOST'),
    port: num('SMTP_PORT', 465),
    user: env('SMTP_USER'),
    pass: env('SMTP_PASS'),
  },
  imap: {
    host: env('IMAP_HOST'),
    port: num('IMAP_PORT', 993),
    user: env('IMAP_USER', env('SMTP_USER')),
    pass: env('IMAP_PASS', env('SMTP_PASS')),
  },

  braveApiKey: env('BRAVE_API_KEY'),
  openPageRankKey: env('OPEN_PAGERANK_API_KEY'),
  model: env('BACKLINKS_MODEL', 'claude-opus-5-5'),

  /** Emails are only really sent when this is on; otherwise they are logged as drafts. */
  live: env('BACKLINKS_LIVE') === '1',

  limits: {
    /** Open PageRank score (0–10) a domain needs. 4 ≈ DA 40+, 5 ≈ DA 50+. */
    minAuthority: num('MIN_AUTHORITY', 4),
    /** New outreach emails per day. Keep this low on a fresh mailbox or it gets flagged. */
    dailySends: num('DAILY_SEND_LIMIT', 15),
    /** Seconds between two sends. */
    sendGapSeconds: num('SEND_GAP_SECONDS', 90),
    followUpAfterDays: num('FOLLOW_UP_AFTER_DAYS', 5),
    /** Days after the follow-up before a silent prospect is closed. */
    giveUpAfterDays: num('GIVE_UP_AFTER_DAYS', 10),
    /** Prospects to keep queued per backlink still wanted (typical reply-to-link rate is 3–8%). */
    prospectsPerLink: num('PROSPECTS_PER_LINK', 15),
    /** Days between re-checks of a page that agreed to link. */
    verifyEveryDays: num('VERIFY_EVERY_DAYS', 2),
  },
};

export function missingSettings(): string[] {
  const required: [string, string][] = [
    ['ANTHROPIC_API_KEY', env('ANTHROPIC_API_KEY') || env('ANTHROPIC_AUTH_TOKEN')],
    ['BRAVE_API_KEY', config.braveApiKey],
    ['OPEN_PAGERANK_API_KEY', config.openPageRankKey],
    ['SENDER_NAME', config.sender.name],
    ['SENDER_EMAIL', config.sender.email],
    ['SENDER_POSTAL_ADDRESS', config.sender.postalAddress],
  ];
  if (config.live) {
    required.push(
      ['SMTP_HOST', config.smtp.host], ['SMTP_USER', config.smtp.user], ['SMTP_PASS', config.smtp.pass],
      ['IMAP_HOST', config.imap.host],
    );
  }
  return required.filter(([, v]) => !v).map(([k]) => k);
}
