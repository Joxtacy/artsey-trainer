import { describe, expect, it } from 'vitest';
import { addConfusion, clearConfusion, confusedPairs, confusionItems, nextPair, topConfusions } from '../src/confusions';
import { parseSettings } from '../src/storage';

const seeded = (seed = 1) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

describe('confusions', () => {
  it('counts misses per target and typed item', () => {
    let c = addConfusion({}, 'b', 'c');
    c = addConfusion(c, 'b', 'c');
    c = addConfusion(c, 'b', 'n');
    expect(c).toEqual({ b: { c: 2, n: 1 } });
  });

  it('ignores a "miss" that is the target itself', () => {
    const c = {};
    expect(addConfusion(c, 'b', 'b')).toBe(c);
  });

  it('does not mutate the input', () => {
    const c = { b: { c: 1 } };
    addConfusion(c, 'b', 'c');
    expect(c).toEqual({ b: { c: 1 } });
  });

  it('cancels one mistake per key when the target is typed right, and removes pairs at zero', () => {
    const c = { b: { c: 2, n: 1 }, a: { e: 1 } };
    expect(clearConfusion(c, 'b')).toEqual({ b: { c: 1 }, a: { e: 1 } });
    expect(clearConfusion(clearConfusion(c, 'b'), 'b')).toEqual({ a: { e: 1 } });
    expect(c).toEqual({ b: { c: 2, n: 1 }, a: { e: 1 } });
  });

  it('leaves the list alone when the target has no confusions', () => {
    const c = { b: { c: 1 } };
    expect(clearConfusion(c, 'c')).toBe(c);
  });

  it('ranks the most frequent confusions first, with a stable order for ties', () => {
    const c = { b: { c: 2, n: 5 }, a: { e: 2 } };
    expect(topConfusions(c)).toEqual([
      { target: 'b', typed: 'n', count: 5 },
      { target: 'a', typed: 'e', count: 2 },
      { target: 'b', typed: 'c', count: 2 },
    ]);
    expect(topConfusions(c, 1)).toHaveLength(1);
  });

  it('merges both directions of a pair', () => {
    const c = { b: { c: 2 }, c: { b: 3 }, a: { e: 4 } };
    expect(confusedPairs(c)).toEqual([
      { a: 'c', b: 'b', count: 5 },
      { a: 'a', b: 'e', count: 4 },
    ]);
    expect(confusionItems(c).sort()).toEqual(['a', 'b', 'c', 'e']);
  });

  it('serves pairs back to back, favours frequent pairs, and skips the last pair', () => {
    const c = { b: { c: 30 }, a: { e: 1 }, h: { n: 1 } };
    const rng = seeded();
    const counts: Record<string, number> = {};
    let last: string | undefined;
    for (let i = 0; i < 1000; i++) {
      const p = nextPair(c, last, rng)!;
      expect(p.key).not.toBe(last);
      expect([...p.ids].sort().join('|')).toBe(p.key);
      counts[p.key] = (counts[p.key] ?? 0) + 1;
      last = p.key;
    }
    expect(counts['b|c']).toBeGreaterThan(counts['a|e']);
  });

  it('repeats the only pair when there is just one', () => {
    expect(nextPair({ b: { c: 1 } }, 'b|c')?.key).toBe('b|c');
  });

  it('has nothing to drill without confusions', () => {
    expect(nextPair({}, undefined)).toBeUndefined();
  });
});

describe('parseSettings', () => {
  it('keeps progress saved before confusions existed', () => {
    const old = JSON.stringify({ side: 'left', lesson: 'pairs', stats: { b: { n: 4, ok: 3, ms: 900 } } });
    const s = parseSettings(old);
    expect(s.side).toBe('left');
    expect(s.lesson).toBe('pairs');
    expect(s.stats).toEqual({ b: { n: 4, ok: 3, ms: 900 } });
    expect(s.confusions).toEqual({});
    expect(s.hint).toBe('delay');
  });

  it('falls back to defaults for missing or broken data', () => {
    expect(parseSettings(null).stats).toEqual({});
    expect(parseSettings('not json').side).toBe('right');
    expect(parseSettings('[1,2]').side).toBe('right');
  });

  it('never shares default objects between loads', () => {
    const a = parseSettings(null);
    a.stats.x = { n: 1, ok: 1, ms: 1 };
    expect(parseSettings(null).stats).toEqual({});
  });
});
