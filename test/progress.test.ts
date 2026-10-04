import { describe, expect, it } from 'vitest';
import { overdue, pick, record, weight } from '../src/drill';
import { KEEP_DAYS, accuracy, daily, dayKey, lastDays, lessonTrends, logLearn, logTypeRound, wpm } from '../src/history';

const DAY = 24 * 60 * 60 * 1000;
// A fixed local noon, so day arithmetic never crosses midnight.
const NOW = new Date(2026, 9, 4, 12, 0, 0).getTime();
const mastered = (daysAgo: number) => ({ n: 20, ok: 20, ms: 500, t: NOW - daysAgo * DAY });

describe('spaced repetition', () => {
  it('records when a key was practised', () => {
    expect(record(undefined, true, 500, NOW).t).toBe(NOW);
    expect(record({ n: 1, ok: 1, ms: 500, t: 0 }, true, 500, NOW).t).toBe(NOW);
  });

  it('makes a mastered key due after 7 days, growing up to a cap', () => {
    expect(overdue(mastered(3), NOW)).toBe(0);
    expect(overdue(mastered(7), NOW)).toBe(1);
    expect(overdue(mastered(14), NOW)).toBe(2);
    expect(overdue(mastered(100), NOW)).toBe(3);
  });

  it('reviews weaker keys sooner', () => {
    const good = { n: 20, ok: 18, ms: 500, t: NOW - 3 * DAY }; // mastery 3: every 3 days
    const learning = { n: 20, ok: 15, ms: 500, t: NOW - 1 * DAY }; // mastery 2: daily
    expect(overdue(good, NOW)).toBe(1);
    expect(overdue(learning, NOW)).toBe(1);
  });

  it('gives no review boost to old data without a timestamp', () => {
    expect(overdue({ n: 20, ok: 20, ms: 500 }, NOW)).toBe(0);
  });

  it('raises the weight of keys not practised recently', () => {
    expect(weight(mastered(21), NOW)).toBeGreaterThan(weight(mastered(1), NOW) + 4);
  });

  it('makes the picker favour an overdue key over fresh ones', () => {
    let seed = 3;
    const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const stats = { a: mastered(30), b: mastered(0), c: mastered(0) };
    const counts: Record<string, number> = { a: 0, b: 0, c: 0 };
    for (let i = 0; i < 3000; i++) counts[pick(['a', 'b', 'c'], stats, undefined, rng, NOW)]++;
    expect(counts.a).toBeGreaterThan(counts.b * 2);
  });
});

describe('history', () => {
  it('keys days by local date', () => {
    expect(dayKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(lastDays(3, NOW)).toEqual(['2026-10-02', '2026-10-03', '2026-10-04']);
  });

  it('adds Learn attempts to the day and the lesson, capping slow answers', () => {
    let h = logLearn({}, 'pairs', true, 600, NOW);
    h = logLearn(h, 'pairs', false, 60_000, NOW);
    h = logLearn(h, 'home', true, 400, NOW);
    expect(h['2026-10-04']).toEqual({
      learn: { n: 3, ok: 2, ms: 600 + 8000 + 400 },
      lessons: { pairs: { n: 2, ok: 1, ms: 8600 }, home: { n: 1, ok: 1, ms: 400 } },
    });
  });

  it('adds completed Type rounds and computes WPM and accuracy', () => {
    let h = logTypeRound({}, 100, 95, 60_000, NOW);
    h = logTypeRound(h, 50, 40, 30_000, NOW);
    expect(h['2026-10-04'].type).toEqual({ n: 150, ok: 135, ms: 90_000, rounds: 2 });
    expect(wpm(h['2026-10-04'].type)).toBe(20);
    expect(accuracy(h['2026-10-04'].type)).toBe(90);
  });

  it('ignores empty rounds', () => {
    const h = {};
    expect(logTypeRound(h, 0, 0, 1000, NOW)).toBe(h);
  });

  it('keeps one summary per day and drops days older than a year', () => {
    let h = logLearn({}, 'home', true, 500, NOW - (KEEP_DAYS + 5) * DAY);
    h = logLearn(h, 'home', true, 500, NOW - 10 * DAY);
    h = logLearn(h, 'home', true, 500, NOW);
    h = logLearn(h, 'home', true, 500, NOW);
    expect(Object.keys(h).sort()).toEqual(['2026-09-24', '2026-10-04']);
  });

  it('gives one point per day, with gaps for days without practice', () => {
    let h = logLearn({}, 'home', true, 500, NOW - 2 * DAY);
    h = logTypeRound(h, 50, 50, 30_000, NOW);
    expect(daily(h, 3, NOW)).toEqual([
      { day: '2026-10-02', wpm: undefined, learnAccuracy: 100, typeAccuracy: undefined, attempts: 1 },
      { day: '2026-10-03', wpm: undefined, learnAccuracy: undefined, typeAccuracy: undefined, attempts: 0 },
      { day: '2026-10-04', wpm: 20, learnAccuracy: undefined, typeAccuracy: 100, attempts: 50 },
    ]);
  });

  it('compares each lesson this week against last week', () => {
    let h = {};
    for (let i = 0; i < 4; i++) h = logLearn(h, 'pairs', i < 2, 500, NOW - 10 * DAY); // last week: 50%
    for (let i = 0; i < 4; i++) h = logLearn(h, 'pairs', i < 3, 500, NOW - 1 * DAY); // this week: 75%
    h = logLearn(h, 'home', true, 500, NOW); // this week only
    const trends = Object.fromEntries(lessonTrends(h, NOW).map((t) => [t.lesson, t]));
    expect(trends.pairs.change).toBe(25);
    expect(trends.home).toMatchObject({ thisWeek: { n: 1 }, lastWeek: undefined, change: undefined });
  });
});
