export interface Stat {
  /** Completed attempts. */
  n: number;
  /** Attempts typed correctly first time. */
  ok: number;
  /** Moving average of time-to-correct, in ms. */
  ms: number;
}

export type Stats = Record<string, Stat>;

const MAX_MS = 8000;

export function record(s: Stat | undefined, firstTry: boolean, ms: number): Stat {
  const t = Math.min(ms, MAX_MS);
  if (!s) return { n: 1, ok: firstTry ? 1 : 0, ms: t };
  return { n: s.n + 1, ok: s.ok + (firstTry ? 1 : 0), ms: Math.round(s.ms * 0.7 + t * 0.3) };
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

/** Higher weight = shown more often. Unseen and weak items dominate. */
export function weight(s: Stat | undefined): number {
  if (!s) return 6;
  const errRate = (s.n - s.ok + 1) / (s.n + 2);
  const slow = Math.min(Math.max(s.ms / 1200, 0.3), 3);
  const fresh = s.n < 5 ? 1.5 : 0;
  return 0.3 + errRate * 6 + slow + fresh;
}

export function pick(ids: string[], stats: Stats, last: string | undefined, rng: () => number = Math.random): string {
  const pool = ids.length > 1 ? ids.filter((id) => id !== last) : ids;
  const weights = pool.map((id) => weight(stats[id]));
  let r = rng() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r < 0) return pool[i];
  }
  return pool[pool.length - 1];
}
