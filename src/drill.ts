export interface Stat {
  /** Completed attempts. */
  n: number;
  /** Attempts typed correctly first time. */
  ok: number;
  /** Moving average of time-to-correct, in ms. */
  ms: number;
  /** When the key was last practised (epoch ms). Missing in data saved before spaced repetition. */
  t?: number;
}

export type Stats = Record<string, Stat>;

export const MAX_MS = 8000;
const DAY_MS = 24 * 60 * 60 * 1000;

export function record(s: Stat | undefined, firstTry: boolean, ms: number, now = Date.now()): Stat {
  const time = Math.min(ms, MAX_MS);
  if (!s) return { n: 1, ok: firstTry ? 1 : 0, ms: time, t: now };
  return { n: s.n + 1, ok: s.ok + (firstTry ? 1 : 0), ms: Math.round(s.ms * 0.7 + time * 0.3), t: now };
}

/** 0 = new, 1 = struggling … 4 = mastered. */
export function mastery(s: Stat | undefined): 0 | 1 | 2 | 3 | 4 {
  if (!s || s.n < 3) return 0;
  const acc = s.ok / s.n;
  if (acc < 0.6 || s.ms > 3000) return 1;
  if (acc < 0.85 || s.ms > 1600) return 2;
  if (acc < 0.95 || s.ms > 900 || s.n < 8) return 3;
  return 4;
}

/**
 * Spaced repetition: how many days a key can rest before it is due for review, by mastery.
 * New and struggling keys (mastery 0–1) already come up often, so they have no interval.
 */
const REVIEW_DAYS: Partial<Record<number, number>> = { 2: 1, 3: 3, 4: 7 };
const MAX_OVERDUE = 3;

/** How far past its review interval a key is: 0 = not due, 1 = exactly due, capped at 3. */
export function overdue(s: Stat | undefined, now = Date.now()): number {
  const days = REVIEW_DAYS[mastery(s)];
  if (!s?.t || !days) return 0;
  const ratio = (now - s.t) / DAY_MS / days;
  return ratio >= 1 ? Math.min(ratio, MAX_OVERDUE) : 0;
}

/** Higher weight = shown more often. Unseen, weak, and overdue items dominate. */
export function weight(s: Stat | undefined, now = Date.now()): number {
  if (!s) return 6;
  const errRate = (s.n - s.ok + 1) / (s.n + 2);
  const slow = Math.min(Math.max(s.ms / 1200, 0.3), 3);
  const fresh = s.n < 5 ? 1.5 : 0;
  return 0.3 + errRate * 6 + slow + fresh + 1.5 * overdue(s, now);
}

export function pick(
  ids: string[],
  stats: Stats,
  last: string | undefined,
  rng: () => number = Math.random,
  now = Date.now(),
): string {
  const pool = ids.length > 1 ? ids.filter((id) => id !== last) : ids;
  const weights = pool.map((id) => weight(stats[id], now));
  let r = rng() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r < 0) return pool[i];
  }
  return pool[pool.length - 1];
}
