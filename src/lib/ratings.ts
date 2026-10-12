/**
 * Tool ratings, stored in Upstash Redis through its REST API (no SDK needed).
 *
 * Each tool keeps one hash, rating:<slug>, with `count` (number of votes) and
 * `sum` (total of all scores). Credentials come from the Vercel ↔ Upstash
 * integration, which sets either the KV_* or the UPSTASH_* pair.
 *
 * Every function degrades to "no data" when Redis is not configured or not
 * reachable, so a build or page never fails because of ratings.
 */

export interface Rating {
  count: number;
  /** Mean score, 1–5, rounded to one decimal. 0 when there are no votes. */
  average: number;
}

/** Votes a tool needs before its rating is shown or put in structured data. */
export const MIN_PUBLIC_VOTES = 5;

const EMPTY: Rating = { count: 0, average: 0 };

function credentials(): { url: string; token: string } | null {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ''), token } : null;
}

export function ratingsConfigured(): boolean {
  return credentials() !== null;
}

/** How often a tool page re-reads its rating (incremental static regeneration). */
const PAGE_REVALIDATE_SECONDS = 60 * 60;

/**
 * Runs Redis commands in one round trip. Returns null on any failure.
 * `revalidate` caches the reply for that many seconds, which keeps a page that
 * reads it static; without it the call always goes to Redis (API routes).
 */
export async function redis(
  commands: (string | number)[][],
  { revalidate }: { revalidate?: number } = {},
): Promise<unknown[] | null> {
  const creds = credentials();
  if (!creds) return null;
  try {
    const res = await fetch(`${creds.url}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${creds.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(commands),
      ...(revalidate ? { cache: 'force-cache' as const, next: { revalidate } } : { cache: 'no-store' as const }),
    });
    if (!res.ok) return null;
    const out = (await res.json()) as { result?: unknown; error?: string }[];
    if (out.some(r => r.error)) return null;
    return out.map(r => r.result);
  } catch {
    return null;
  }
}

export function ratingKey(slug: string): string {
  return `rating:${slug}`;
}

/** Turns an HGETALL reply (flat [field, value, …] array) into a Rating. */
export function toRating(reply: unknown): Rating {
  if (!Array.isArray(reply)) return EMPTY;
  const fields: Record<string, number> = {};
  for (let i = 0; i + 1 < reply.length; i += 2) fields[String(reply[i])] = Number(reply[i + 1]);
  const count = fields.count || 0;
  const sum = fields.sum || 0;
  if (count <= 0) return EMPTY;
  return { count, average: Math.round((sum / count) * 10) / 10 };
}

/** Live rating, for the API. */
export async function getRating(slug: string): Promise<Rating> {
  const reply = await redis([['HGETALL', ratingKey(slug)]]);
  return reply ? toRating(reply[0]) : EMPTY;
}

/**
 * Rating for rendering a tool page: cached and refreshed hourly so the page
 * stays prerendered. The static (desktop) export has no server to refresh it,
 * so it skips ratings.
 */
export async function getPageRating(slug: string): Promise<Rating> {
  if (process.env.STATIC_EXPORT === '1') return EMPTY;
  const reply = await redis([['HGETALL', ratingKey(slug)]], { revalidate: PAGE_REVALIDATE_SECONDS });
  return reply ? toRating(reply[0]) : EMPTY;
}
