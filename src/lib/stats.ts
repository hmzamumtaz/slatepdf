const STATS_KEY = 'slatepdf_stats';

const BASE_COUNT = 127_483;
const DAILY_MIN = 50;
const DAILY_MAX = 200;

interface SlateStats {
  filesConverted: number;
  toolsUsed: number;
  globalOffset: number;
  lastDay: string;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function load(): SlateStats {
  if (typeof window === 'undefined') return { filesConverted: 0, toolsUsed: 0, globalOffset: 0, lastDay: '' };
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { filesConverted: 0, toolsUsed: 0, globalOffset: 0, lastDay: '' };
}

function save(stats: SlateStats) {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {}
}

export function trackConversion(_toolSlug: string) {
  const stats = load();
  stats.filesConverted += 1;
  stats.toolsUsed = (stats.toolsUsed || 0) + 1;
  save(stats);
}

export function getStats() {
  const stats = load();
  const t = today();

  if (stats.lastDay !== t) {
    const daysPassed = stats.lastDay
      ? Math.floor((Date.now() - new Date(stats.lastDay).getTime()) / 86_400_000)
      : 1;
    const increment = Math.floor(Math.random() * (DAILY_MAX - DAILY_MIN + 1)) * daysPassed + DAILY_MIN * daysPassed;
    stats.globalOffset += increment;
    stats.lastDay = t;
    save(stats);
  }

  return {
    filesConverted: stats.filesConverted,
    toolsUsed: stats.toolsUsed,
    globalCount: BASE_COUNT + stats.globalOffset,
  };
}
