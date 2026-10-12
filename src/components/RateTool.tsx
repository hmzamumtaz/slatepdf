'use client';

import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { MIN_PUBLIC_VOTES, type Rating } from '@/lib/ratings';

type Status = 'idle' | 'saving' | 'thanks' | 'already' | 'error';

function storageKey(slug: string) {
  return `slatepdf:rated:${slug}`;
}

/**
 * "Rate this tool" stars. `initial` is the rating at build time, rendered in
 * the HTML so it matches the page's structured data; the widget then fetches
 * the live figure. If the rating service is unavailable (not configured, or
 * the offline desktop build) the widget hides itself.
 */
export default function RateTool({ slug, toolName, initial }: { slug: string; toolName: string; initial: Rating }) {
  const [rating, setRating] = useState<Rating>(initial);
  const [available, setAvailable] = useState(initial.count > 0);
  const [hover, setHover] = useState(0);
  const [chosen, setChosen] = useState(0);
  const [status, setStatus] = useState<Status>('idle');

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/rating?tool=${encodeURIComponent(slug)}`)
      .then(res => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((live: Rating) => {
        if (cancelled) return;
        setRating(live);
        setAvailable(true);
        try {
          const saved = Number(localStorage.getItem(storageKey(slug)));
          if (saved >= 1 && saved <= 5) {
            setChosen(saved);
            setStatus('already');
          }
        } catch { /* storage blocked: the server still stops repeat votes */ }
      })
      .catch(() => { if (!cancelled) setAvailable(false); });
    return () => { cancelled = true; };
  }, [slug]);

  async function vote(score: number) {
    if (status === 'saving' || status === 'thanks' || status === 'already') return;
    setChosen(score);
    setStatus('saving');
    try {
      const res = await fetch('/api/rating', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: slug, score }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok || res.status === 409) {
        if (data && typeof data.count === 'number') setRating({ count: data.count, average: data.average });
        setStatus(res.ok ? 'thanks' : 'already');
        try { localStorage.setItem(storageKey(slug), String(score)); } catch { /* ignore */ }
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  }

  if (!available) return null;

  const locked = status === 'saving' || status === 'thanks' || status === 'already';
  const shown = hover || chosen;
  const showAggregate = rating.count >= MIN_PUBLIC_VOTES;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 rounded-2xl border border-border bg-white px-5 py-4">
        <p className="font-semibold text-foreground">Rate {toolName}</p>
        <div
          role="radiogroup"
          aria-label={`Rate ${toolName} from 1 to 5 stars`}
          className="flex items-center gap-1"
          onMouseLeave={() => setHover(0)}
        >
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={chosen === n}
              aria-label={`${n} star${n > 1 ? 's' : ''}`}
              disabled={locked}
              onMouseEnter={() => !locked && setHover(n)}
              onFocus={() => !locked && setHover(n)}
              onBlur={() => setHover(0)}
              onClick={() => vote(n)}
              className="p-0.5 rounded disabled:cursor-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            >
              <Star className={`w-6 h-6 transition-colors ${n <= shown ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
            </button>
          ))}
        </div>
        <p className="text-sm text-gray-600" aria-live="polite">
          {status === 'thanks' && 'Thanks for rating! '}
          {status === 'already' && 'You have rated this tool. '}
          {status === 'error' && 'Could not save your rating — please try again later. '}
          {showAggregate
            ? <><strong className="text-foreground">{rating.average.toFixed(1)} / 5</strong> from {rating.count.toLocaleString('en-US')} votes</>
            : status === 'idle' && 'Tell us how it worked for you.'}
        </p>
      </div>
    </div>
  );
}
