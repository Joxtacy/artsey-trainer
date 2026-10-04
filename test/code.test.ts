import { describe, expect, it } from 'vitest';
import { CODE_SAMPLES, generateCode } from '../src/code';
import { ITEM_BY_CHAR } from '../src/layout';
import { sanitize } from '../src/words';

const seeded = (seed = 5) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

describe('code samples', () => {
  it.each(CODE_SAMPLES)('can be typed on the layout: %s', (sample) => {
    const missing = [...sample].filter((c) => !ITEM_BY_CHAR.has(c));
    expect(missing).toEqual([]);
    // Same text after the custom-text cleanup, so nothing would be dropped or changed.
    expect(sanitize(sample)).toBe(sample);
  });

  it('use the bracket and symbol layers, and every shifted character', () => {
    const all = CODE_SAMPLES.join('');
    for (const c of '()[]{}\\;`?-=') expect(all, c).toContain(c);
    for (const c of ':"<>_+|~@#$%^&*') expect(all, c).toContain(c);
  });

  it('are unique', () => {
    expect(new Set(CODE_SAMPLES).size).toBe(CODE_SAMPLES.length);
  });
});

describe('generateCode', () => {
  it('returns the requested number of samples, never repeating one back to back', () => {
    const rng = seeded();
    for (let round = 0; round < 50; round++) {
      const picked = generateCode(8, rng);
      expect(picked).toHaveLength(8);
      for (const p of picked) expect(CODE_SAMPLES).toContain(p);
      for (let i = 1; i < picked.length; i++) expect(picked[i]).not.toBe(picked[i - 1]);
    }
  });
});
