import { MAX_MS } from './drill';

/** Running totals; averages are computed when shown so days can keep accumulating. */
export interface Totals {
  /** Attempts (Learn) or characters (Type). */
  n: number;
  /** Of those, right on the first try. */
  ok: number;
  /** Time spent, ms. */
  ms: number;
}

export interface DayLog {
  learn?: Totals;
  /** Completed Type rounds only, so WPM matches the round results. */
  type?: Totals & { rounds: number };
  /** Learn totals per lesson id. */
  lessons?: Record<string, Totals>;
}

/** One summary per local calendar day, keyed "YYYY-MM-DD". */
export type History = Record<string, DayLog>;

export const KEEP_DAYS = 365;
const DAY_MS = 24 * 60 * 60 * 1000;

export function dayKey(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** The last `count` local days, oldest first, ending today. */
export function lastDays(count: number, now = Date.now()): string[] {
  const today = new Date(now);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (count - 1 - i));
    return dayKey(d);
  });
}

const add = (t: Totals | undefined, firstTry: boolean, ms: number): Totals => ({
  n: (t?.n ?? 0) + 1,
  ok: (t?.ok ?? 0) + (firstTry ? 1 : 0),
  ms: (t?.ms ?? 0) + Math.min(ms, MAX_MS),
});

/** Drops days older than KEEP_DAYS so stored history stays small. */
export function prune(h: History, now = Date.now()): History {
  const oldest = dayKey(new Date(now - (KEEP_DAYS - 1) * DAY_MS));
  const kept = Object.entries(h).filter(([day]) => day >= oldest);
  return kept.length === Object.keys(h).length ? h : Object.fromEntries(kept);
}

export function logLearn(h: History, lesson: string, firstTry: boolean, ms: number, now = Date.now()): History {
  const day = dayKey(new Date(now));
  const log = h[day] ?? {};
  const lessons = log.lessons ?? {};
  return prune(
    {
      ...h,
      [day]: { ...log, learn: add(log.learn, firstTry, ms), lessons: { ...lessons, [lesson]: add(lessons[lesson], firstTry, ms) } },
    },
    now,
  );
}

export function logTypeRound(h: History, chars: number, ok: number, ms: number, now = Date.now()): History {
  if (chars <= 0 || ms <= 0) return h;
  const day = dayKey(new Date(now));
  const log = h[day] ?? {};
  const t = log.type ?? { n: 0, ok: 0, ms: 0, rounds: 0 };
  return prune({ ...h, [day]: { ...log, type: { n: t.n + chars, ok: t.ok + ok, ms: t.ms + ms, rounds: t.rounds + 1 } } }, now);
}

export const accuracy = (t?: Totals) => (t && t.n ? Math.round((t.ok / t.n) * 100) : undefined);
/** Words per minute, counting five characters as a word. */
export const wpm = (t?: Totals) => (t && t.ms ? Math.round(t.n / 5 / (t.ms / 60000)) : undefined);

export interface DayPoint {
  day: string;
  wpm?: number;
  learnAccuracy?: number;
  typeAccuracy?: number;
  attempts: number;
}

/** One point per day in the window, including days with no practice (left undefined). */
export function daily(h: History, days = 30, now = Date.now()): DayPoint[] {
  return lastDays(days, now).map((day) => {
    const log = h[day];
    return {
      day,
      wpm: wpm(log?.type),
      learnAccuracy: accuracy(log?.learn),
      typeAccuracy: accuracy(log?.type),
      attempts: (log?.learn?.n ?? 0) + (log?.type?.n ?? 0),
    };
  });
}

const sum = (ts: (Totals | undefined)[]): Totals | undefined => {
  const present = ts.filter((t): t is Totals => !!t);
  if (!present.length) return undefined;
  return present.reduce((a, b) => ({ n: a.n + b.n, ok: a.ok + b.ok, ms: a.ms + b.ms }));
};

export interface LessonTrend {
  lesson: string;
  thisWeek?: Totals;
  lastWeek?: Totals;
  /** Change in first-try accuracy, percentage points; undefined unless both weeks have data. */
  change?: number;
}

/** Each lesson practised in the last 14 days: the last 7 days against the 7 before. */
export function lessonTrends(h: History, now = Date.now()): LessonTrend[] {
  const days = lastDays(14, now);
  const [prev, recent] = [days.slice(0, 7), days.slice(7)];
  const lessons = new Set(days.flatMap((d) => Object.keys(h[d]?.lessons ?? {})));
  return [...lessons].map((lesson) => {
    const thisWeek = sum(recent.map((d) => h[d]?.lessons?.[lesson]));
    const lastWeek = sum(prev.map((d) => h[d]?.lessons?.[lesson]));
    const a = accuracy(thisWeek);
    const b = accuracy(lastWeek);
    return { lesson, thisWeek, lastWeek, change: a !== undefined && b !== undefined ? a - b : undefined };
  });
}
