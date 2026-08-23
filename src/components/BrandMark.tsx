/**
 * The Slate PDF mark: a black slate carrying three white rules, the way a page
 * of notes reads from across a room — a heading, a full line, a short last line.
 *
 * The mark carries its own black ground rather than inheriting one, so it looks
 * identical everywhere it appears. `ring` adds a hairline for the rare surface
 * that is itself near-black (the footer).
 */
export default function BrandMark({
  className = 'w-9 h-9',
  ring = false,
}: {
  className?: string;
  ring?: boolean;
}) {
  return (
    <svg viewBox="0 0 64 64" className={className} role="img" aria-label="Slate PDF">
      <rect width="64" height="64" rx="14" fill="#000000" />
      {ring && <rect x="0.75" y="0.75" width="62.5" height="62.5" rx="13.25" fill="none" stroke="#ffffff" strokeOpacity="0.22" strokeWidth="1.5" />}
      <g stroke="#ffffff" strokeWidth="5" strokeLinecap="round">
        <path d="M16 21h20" />
        <path d="M16 32h32" />
        <path d="M16 43h25" />
      </g>
    </svg>
  );
}
