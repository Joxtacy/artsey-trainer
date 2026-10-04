import { weight, type Stats } from './drill';
import { ITEM_BY_CHAR, ITEM_BY_ID } from './layout';

/** Pair stats are keyed "<from id>><to id>", e.g. "t>h" or "space>t". */
export const pairKey = (from: string, to: string) => `${from}>${to}`;

/** Pairs need a few samples before their timing means anything. */
const MIN_PAIR_SAMPLES = 3;
/** A pair counts as slow when it takes this much longer than your median pair. */
const SLOW_FACTOR = 1.25;

export interface SlowPair {
  key: string;
  from: string;
  to: string;
  ms: number;
  /** Time relative to the median pair; 1.5 = 50% slower than usual. */
  factor: number;
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** Transitions that are clearly slower than your median transition, slowest first. */
export function slowestPairs(pairStats: Stats, limit = 5): SlowPair[] {
  const measured = Object.entries(pairStats).filter(([, s]) => s.n >= MIN_PAIR_SAMPLES);
  if (measured.length < 2) return [];
  const mid = median(measured.map(([, s]) => s.ms));
  return measured
    .map(([key, s]) => {
      const [from, to] = key.split('>');
      return { key, from, to, ms: s.ms, factor: s.ms / mid };
    })
    .filter((p) => p.factor >= SLOW_FACTOR)
    .sort((a, b) => b.factor - a.factor)
    .slice(0, limit);
}

/** The letters you are weakest at, by the same weight Learn uses to pick prompts. */
export function weakestLetters(stats: Stats, limit = 5): string[] {
  const letters = 'abcdefghijklmnopqrstuvwxyz'.split('');
  return letters
    .map((l) => ({ l, w: weight(stats[l]) }))
    .sort((a, b) => b.w - a.w || a.l.localeCompare(b.l))
    .slice(0, limit)
    .map((x) => x.l);
}

/**
 * How strongly to favour a word: words made of weak letters, or containing slow transitions,
 * get a larger weight. A word of strong letters with no slow pairs stays near 1.
 */
export function wordWeigher(stats: Stats, pairStats: Stats): (word: string) => number {
  const slow = new Map(slowestPairs(pairStats, Infinity).map((p) => [p.key, p.factor]));
  return (word) => {
    const ids = word.split('').map((c) => ITEM_BY_CHAR.get(c)?.id).filter((id): id is string => !!id);
    if (!ids.length) return 1;
    const letters = ids.filter((id) => /^[a-z]$/.test(id));
    const meanWeakness = letters.length ? letters.reduce((sum, id) => sum + weight(stats[id]), 0) / letters.length : 1;
    let pairBonus = 0;
    for (let i = 1; i < ids.length; i++) pairBonus += (slow.get(pairKey(ids[i - 1], ids[i])) ?? 1) - 1;
    return meanWeakness ** 2 + 3 * pairBonus;
  };
}

/** "T→H", using the on-screen labels (␣ for space). */
export function pairLabel(from: string, to: string): string {
  const label = (id: string) => ITEM_BY_ID.get(id)?.label ?? id;
  return `${label(from)}→${label(to)}`;
}
