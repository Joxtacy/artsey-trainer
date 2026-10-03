import { describe, expect, it } from 'vitest';
import { mastery, pick, record } from '../src/drill';
import { ITEM_BY_ID } from '../src/layout';
import { explain, identify, isIgnorable, matches } from '../src/match';

const ev = (key: string, code: string, shiftKey = false) => ({ key, code, shiftKey });

describe('matches', () => {
  it('accepts letters regardless of case', () => {
    expect(matches(ev('B', 'KeyB', true), ITEM_BY_ID.get('b')!.match!)).toBe(true);
  });
  it('falls back to the US physical key on other OS layouts', () => {
    // Swedish layout: Shift+Digit9 yields ')' but the firmware meant '('.
    expect(matches(ev(')', 'Digit9', true), ITEM_BY_ID.get('brackets:(')!.match!)).toBe(true);
    expect(matches(ev('9', 'Digit9', false), ITEM_BY_ID.get('brackets:(')!.match!)).toBe(false);
  });
  it('identifies what was typed', () => {
    expect(identify(ev(' ', 'Space'))?.id).toBe('space');
    expect(identify(ev('?', 'Slash', true))?.id).toBe('symbols:?');
  });
  it('ignores bare modifiers', () => {
    expect(isIgnorable(ev('Shift', 'ShiftLeft', true))).toBe(true);
    expect(isIgnorable(ev('a', 'KeyA'))).toBe(false);
  });
});

describe('drill', () => {
  it('records stats', () => {
    const s = record(record(undefined, true, 1000), false, 2000);
    expect(s).toMatchObject({ n: 2, ok: 1 });
    expect(s.ms).toBe(1300);
  });
  it('rates mastery', () => {
    expect(mastery(undefined)).toBe(0);
    expect(mastery({ n: 10, ok: 10, ms: 500 })).toBe(4);
    expect(mastery({ n: 10, ok: 4, ms: 500 })).toBe(1);
  });
  it('never repeats the last item and favours weak items', () => {
    const counts: Record<string, number> = { a: 0, b: 0, c: 0 };
    let seed = 1;
    const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const stats = { a: { n: 20, ok: 20, ms: 400 }, b: { n: 20, ok: 5, ms: 2500 } };
    for (let i = 0; i < 2000; i++) {
      const id = pick(['a', 'b', 'c'], stats, 'c', rng);
      expect(id).not.toBe('c');
      counts[id]++;
    }
    expect(counts.b).toBeGreaterThan(counts.a * 2);
  });
});

describe('explain', () => {
  it('explains letters, keeping case', () => {
    expect(explain(ev('B', 'KeyB', true), 'right')).toMatchObject({ label: 'B', name: 'Letter', chord: { press: ['e', 'o'] }, letter: true });
    expect(explain(ev('å', 'KeyA'), 'right')?.label).toBe('a');
    expect(explain(ev('b', 'KeyB'), 'right')?.label).toBe('b');
  });
  it('explains layer characters', () => {
    expect(explain(ev('7', 'Digit7'), 'left')).toMatchObject({ name: 'Numbers layer', chord: { press: ['a', 'r'], hold: 's' } });
  });
  it('explains one-shot modifiers', () => {
    expect(explain(ev('Meta', 'MetaLeft'), 'right')).toMatchObject({ label: 'Gui', chord: { press: ['s', 'y'] } });
  });
  it('explains locked nav keys per side', () => {
    expect(explain(ev('Home', 'Home'), 'right')?.chord).toEqual({ press: ['a'] });
    expect(explain(ev('Home', 'Home'), 'left')?.chord).toEqual({ press: ['t'] });
  });
  it('returns undefined for unknown keys', () => {
    expect(explain(ev('F5', 'F5'), 'right')).toBeUndefined();
  });
});
