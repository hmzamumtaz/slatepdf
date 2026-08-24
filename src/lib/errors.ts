/**
 * User-facing error policy: error text that originates from our own UI logic is
 * short, human and safe to show. Anything else (upstream service errors,
 * network/parse internals) must never reach the screen — those are replaced
 * with a generic "busy" message. The real error is always logged to the
 * console for debugging.
 */
export const SERVICE_BUSY_MESSAGE =
  'This tool is experiencing high usage right now. Please come back a little later and try again.';

const TECHNICAL = [
  /\bhttps?:\/\//i,
  /\bhttp\b/i,
  /\bstatus(?:\s+code)?\s*\d/i,
  /\bjson\b/i,
  /\bfetch\b/i,
  /\bnetwork\b/i,
  /\bcors\b/i,
  /\babort/i,
  /\btime(?:d)?\s*-?\s*out\b/i,
  /\bmymemory\b/i,
  /\blingva\b/i,
  /\blibretranslate\b/i,
  /\bquota\b/i,
  /\blimit\b/i,
  /\bexceed/i,
  /\bwarning/i,
  /\bchars?\b/i,
  /\bbuffer\b/i,
  /\bparse\b/i,
  /\binvalid\b/i,
  /\bundefined\b/i,
  /is\s+not\s+a\s+function/i,
  /\bexception\b/i,
  /^error:/i,
];

export function friendlyError(err: unknown): string {
  if (err) console.error(err);
  const message = err instanceof Error && err.message ? err.message.trim() : '';
  if (!message) return SERVICE_BUSY_MESSAGE;
  if (message.length > 200) return SERVICE_BUSY_MESSAGE;
  if (TECHNICAL.some((re) => re.test(message))) return SERVICE_BUSY_MESSAGE;
  return message;
}
