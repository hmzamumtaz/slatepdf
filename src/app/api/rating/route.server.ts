import { createHash } from 'node:crypto';
import { getToolBySlug } from '@/lib/tools-data';
import { getRating, ratingKey, ratingsConfigured, redis, toRating } from '@/lib/ratings';

// Only built on Vercel; the static (Electron) export leaves .server.ts files out.
export const dynamic = 'force-dynamic';

/** One vote per visitor per tool in this window. */
const VOTE_WINDOW_SECONDS = 60 * 60 * 24 * 30;

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

function validSlug(slug: unknown): slug is string {
  return typeof slug === 'string' && !!getToolBySlug(slug);
}

/** Hashed so raw IP addresses are never stored. */
function voterId(request: Request, slug: string): string {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';
  const salt = process.env.RATING_SALT ?? 'slatepdf-ratings';
  return createHash('sha256').update(`${salt}:${slug}:${ip}`).digest('hex').slice(0, 32);
}

export async function GET(request: Request) {
  const slug = new URL(request.url).searchParams.get('tool');
  if (!validSlug(slug)) return json({ error: 'Unknown tool' }, 400);
  if (!ratingsConfigured()) return json({ error: 'Ratings are not set up' }, 503);
  return json(await getRating(slug));
}

export async function POST(request: Request) {
  if (!ratingsConfigured()) return json({ error: 'Ratings are not set up' }, 503);

  let body: { tool?: unknown; score?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid request' }, 400);
  }
  const { tool, score } = body;
  if (!validSlug(tool)) return json({ error: 'Unknown tool' }, 400);
  if (typeof score !== 'number' || !Number.isInteger(score) || score < 1 || score > 5) {
    return json({ error: 'Score must be a whole number from 1 to 5' }, 400);
  }

  const voteKey = `rating-vote:${tool}:${voterId(request, tool)}`;
  const claimed = await redis([['SET', voteKey, String(score), 'NX', 'EX', VOTE_WINDOW_SECONDS]]);
  if (!claimed) return json({ error: 'Could not save your rating' }, 502);
  if (claimed[0] !== 'OK') return json({ ...(await getRating(tool)), alreadyRated: true }, 409);

  const key = ratingKey(tool);
  const saved = await redis([
    ['HINCRBY', key, 'count', 1],
    ['HINCRBY', key, 'sum', score],
    ['HGETALL', key],
  ]);
  if (!saved) return json({ error: 'Could not save your rating' }, 502);
  return json(toRating(saved[2]));
}
