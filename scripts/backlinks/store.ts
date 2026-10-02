/**
 * All campaign state lives in one JSON file in `.backlinks/` (gitignored: it
 * holds third-party contact details). Writes go through a temp file + rename
 * so a crash mid-write can't corrupt it.
 */
import fs from 'node:fs';
import path from 'node:path';
import { config } from './config';

export type ProspectStatus =
  | 'found'        // passed search + authority, not yet read
  | 'rejected'     // not relevant, no contact, already links, etc.
  | 'queued'       // email drafted, waiting for a send slot
  | 'contacted'    // first email sent
  | 'followed_up'  // follow-up sent
  | 'talking'      // they replied with a question, we answered
  | 'agreed'       // they said yes; waiting for the link to appear
  | 'won'          // link verified live on their page
  | 'declined'
  | 'closed';      // no reply after follow-up

export interface EmailRecord {
  direction: 'out' | 'in';
  at: string;
  subject: string;
  body: string;
  messageId?: string;
  dryRun?: boolean;
}

export interface Prospect {
  id: string;
  url: string;
  domain: string;
  title: string;
  query: string;
  authority: number;        // Open PageRank 0–10
  status: ProspectStatus;
  reason?: string;          // why rejected / what the angle is
  opportunityType?: string; // roundup, resource page, guest post, …
  targetUrl?: string;       // the SlatePDF page we ask them to link
  contactEmail?: string;
  contactName?: string;
  emails: EmailRecord[];
  linkFound?: { at: string; rel: string; anchor: string };
  lastCheckedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface State {
  campaign: { target: number; startedAt: string } | null;
  prospects: Prospect[];
  /** Domains and addresses that must never be contacted again. */
  suppressed: string[];
  seenQueries: string[];
  sendLog: string[]; // ISO timestamps of outreach sends, for the daily cap
}

const FILE = path.join(config.stateDir, 'state.json');

export function load(): State {
  if (!fs.existsSync(FILE)) return { campaign: null, prospects: [], suppressed: [], seenQueries: [], sendLog: [] };
  return JSON.parse(fs.readFileSync(FILE, 'utf8')) as State;
}

export function save(state: State) {
  fs.mkdirSync(config.stateDir, { recursive: true });
  const tmp = `${FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
  fs.renameSync(tmp, FILE);
}

export function touch(p: Prospect, patch: Partial<Prospect>) {
  Object.assign(p, patch, { updatedAt: new Date().toISOString() });
}

export function isSuppressed(state: State, domainOrEmail: string) {
  const v = domainOrEmail.toLowerCase();
  return state.suppressed.some(s => v === s || v.endsWith(`@${s}`) || v.endsWith(`.${s}`));
}

export function suppress(state: State, ...values: (string | undefined)[]) {
  for (const v of values) if (v && !state.suppressed.includes(v.toLowerCase())) state.suppressed.push(v.toLowerCase());
}

export const daysSince = (iso: string) => (Date.now() - new Date(iso).getTime()) / 86_400_000;

export function log(message: string) {
  const line = `[${new Date().toISOString()}] ${message}`;
  console.log(line);
  fs.mkdirSync(config.stateDir, { recursive: true });
  fs.appendFileSync(path.join(config.stateDir, 'activity.log'), `${line}\n`);
}
