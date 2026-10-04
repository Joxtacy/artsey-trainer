import { describe, expect, it } from 'vitest';
import type { Stats } from '../src/drill';
import { pairLabel, slowestPairs, weakestLetters, wordWeigher } from '../src/focus';
import { LAYOUTS } from '../src/layout';
import { generateText } from '../src/words';

const L = LAYOUTS['0.8.1'];
const seeded = (seed = 7) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const strong = { n: 20, ok: 20, ms: 400 };
const weak = { n: 20, ok: 8, ms: 2500 };
const WEAK = 'qzxjk';
const allStrongExcept = (weakLetters: string): Stats =>
  Object.fromEntries('abcdefghijklmnopqrstuvwxyz'.split('').map((l) => [l, weakLetters.includes(l) ? weak : strong]));
const pair = (ms: number, n = 5) => ({ n, ok: n, ms });

describe('slowestPairs', () => {
  it('lists pairs clearly slower than the median, slowest first', () => {
    const pairs = { 'a>b': pair(300), 'b>c': pair(310), 'c>d': pair(320), 't>h': pair(900), 'i>n': pair(600) };
    expect(slowestPairs(pairs).map((p) => p.key)).toEqual(['t>h', 'i>n']);
    expect(slowestPairs(pairs)[0]).toMatchObject({ from: 't', to: 'h', ms: 900 });
  });

  it('ignores pairs with too few samples', () => {
    expect(slowestPairs({ 'a>b': pair(300), 'b>c': pair(300), 't>h': pair(5000, 2) })).toEqual([]);
  });

  it('needs at least two measured pairs to compare', () => {
    expect(slowestPairs({ 't>h': pair(900) })).toEqual([]);
  });
});

describe('weakestLetters', () => {
  it('ranks unseen and weak letters first', () => {
    const stats = allStrongExcept('qz');
    delete stats.x;
    expect(weakestLetters(stats, 3)).toEqual(['x', 'q', 'z']);
  });
});

describe('wordWeigher', () => {
  it('favours words made of weak letters', () => {
    const w = wordWeigher(allStrongExcept(WEAK), {}, L);
    expect(w('quick')).toBeGreaterThan(w('the') * 2);
  });

  it('favours words containing a slow transition', () => {
    const pairs = { 't>h': pair(1200), 'a>n': pair(300), 'n>d': pair(300), 'o>f': pair(300) };
    const w = wordWeigher(allStrongExcept(''), pairs, L);
    expect(w('the')).toBeGreaterThan(w('and'));
  });
});

describe('generateText with focus', () => {
  const share = (text: string) => {
    const letters = text.replace(/[^a-z]/g, '');
    return [...letters].filter((c) => WEAK.includes(c)).length / letters.length;
  };

  it('uses more weak letters than random text', () => {
    const opts = { count: 2000, punctuation: false, numbers: false };
    const random = generateText({ ...opts, rng: seeded() });
    const focused = generateText({ ...opts, rng: seeded(), weigh: wordWeigher(allStrongExcept(WEAK), {}, L) });
    expect(share(focused)).toBeGreaterThan(share(random) * 2);
  });
});

it('labels pairs with on-screen labels', () => {
  expect(pairLabel('t', 'h', L)).toBe('T→H');
  expect(pairLabel('space', 't', L)).toBe('␣→T');
});
