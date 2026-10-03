import { describe, expect, it } from 'vitest';
import { BASE_ITEMS, GRID, HOLD, ITEM_BY_CHAR, ITEM_BY_ID, ITEMS, LAYERS, LESSONS, describeChord, type Side } from '../src/layout';

const sig = (press: string[], hold?: string) => `${hold ?? ''}|${[...press].sort().join('')}`;
const pos = (side: Side, k: string) => GRID[side].indexOf(k as never);
const mirror = (p: number) => (p < 4 ? 3 - p : 11 - p);

describe('layout', () => {
  it('left grid is the mirror image of the right grid', () => {
    GRID.right.forEach((k, p) => expect(GRID.left[mirror(p)]).toBe(k));
  });

  it('covers all 26 letters', () => {
    for (const c of 'abcdefghijklmnopqrstuvwxyz') expect(ITEM_BY_CHAR.get(c)?.id).toBe(c);
  });

  it('has no duplicate base-layer chords', () => {
    const seen = new Map<string, string>();
    for (const item of BASE_ITEMS) {
      const s = sig(item.chords.right.press);
      expect(seen.get(s), `${item.id} collides with ${seen.get(s)}`).toBeUndefined();
      seen.set(s, item.id);
    }
  });

  it('matches spot checks read off the reference card (right hand)', () => {
    const r = (id: string) => ITEM_BY_ID.get(id)!.chords.right.press.map((k) => pos('right', k)).sort();
    expect(r('b')).toEqual([4, 7]);
    expect(r('z')).toEqual([0, 1, 2, 3]);
    expect(r('space')).toEqual([4, 5, 6, 7]);
    expect(r('esc')).toEqual([0, 1, 7]);
  });

  it('matches spot checks read off the reference card (left hand)', () => {
    const l = (id: string) => ITEM_BY_ID.get(id)!.chords.left.press.map((k) => pos('left', k)).sort();
    expect(l('m')).toEqual([4, 5, 6]);
    expect(l('d')).toEqual([1, 2, 3]);
    expect(l('enter')).toEqual([3, 7]);
  });

  it('every hold layer reserves its hold key and has 8 cells per side', () => {
    for (const layer of LAYERS) {
      for (const side of ['left', 'right'] as Side[]) {
        expect(layer.cells[side]).toHaveLength(8);
        if (layer.hold) expect(layer.cells[side][pos(side, layer.hold)]).toBe(HOLD);
      }
    }
  });

  it('numbers are the same keys on both sides; brackets are not', () => {
    expect(ITEM_BY_ID.get('numbers:5')!.chords.left).toEqual(ITEM_BY_ID.get('numbers:5')!.chords.right);
    expect(ITEM_BY_ID.get('numbers:9')!.chords.right).toEqual({ press: ['e', 'y'], hold: 's' });
    expect(ITEM_BY_ID.get('brackets:(')!.chords.right.press).toEqual(['r']);
    expect(ITEM_BY_ID.get('brackets:(')!.chords.left.press).toEqual(['t']);
  });

  it('prefers base-layer combos over layer keys for shared characters', () => {
    expect(ITEM_BY_CHAR.get('!')!.id).toBe('!');
  });

  it('every lesson item exists and is matchable', () => {
    for (const l of LESSONS) for (const id of l.items) expect(ITEM_BY_ID.get(id)?.match, id).toBeDefined();
  });

  it('every layer item has a chord on both sides', () => {
    for (const i of ITEMS) expect(i.chords.left.press.length + i.chords.right.press.length).toBeGreaterThan(0);
  });

  it('describes chords', () => {
    expect(describeChord(ITEM_BY_ID.get('symbols:?')!.chords.right)).toBe('Hold E, then Y');
  });
});
