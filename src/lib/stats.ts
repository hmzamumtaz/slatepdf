const STATS_KEY = 'slatepdf_stats';

interface SlateStats {
  filesConverted: number;
  toolsUsed: number;
}

function load(): SlateStats {
  if (typeof window === 'undefined') return { filesConverted: 0, toolsUsed: 0 };
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { filesConverted: 0, toolsUsed: 0 };
}

function save(stats: SlateStats) {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {}
}

export function trackConversion(toolSlug: string) {
  const stats = load();
  stats.filesConverted += 1;
  stats.toolsUsed = (stats.toolsUsed || 0) + 1;
  save(stats);
}

export function getStats(): SlateStats {
  return load();
}
