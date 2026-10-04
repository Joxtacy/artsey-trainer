import { describe, expect, it } from 'vitest';
import { GRID, HOLD, LAYOUTS, VERSIONS, describeChord, type Item, type Side } from '../src/layout';

const L081 = LAYOUTS['0.8.1'];
const L090 = LAYOUTS['0.9.0'];
const { baseItems: BASE_ITEMS, byChar: ITEM_BY_CHAR, shiftedItems: SHIFTED_ITEMS, byId: ITEM_BY_ID, items: ITEMS, lessons: LESSONS } = L081;

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

  it.each(VERSIONS.map((v) => v.id))('every hold layer reserves its hold key and has 8 cells per side (%s)', (version) => {
    for (const layer of LAYOUTS[version].layers) {
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

  it('types shifted characters with one-shot Shift and then the base key', () => {
    expect(ITEM_BY_CHAR.get(':')!.id).toBe('shift:colon');
    expect(ITEM_BY_CHAR.get(':')!.chords.right).toEqual({ ...ITEM_BY_CHAR.get(';')!.chords.right, shift: true });
    expect(ITEM_BY_CHAR.get('"')!.chords.left).toEqual({ ...ITEM_BY_CHAR.get("'")!.chords.left, shift: true });
    expect(ITEM_BY_CHAR.get('*')!.chords.right).toEqual({ press: ['r', 't'], hold: 's', shift: true });
    expect(describeChord(ITEM_BY_CHAR.get(':')!.chords.right)).toBe('Shift (R + T + S + E), then hold E, then T');
    expect(describeChord(ITEM_BY_CHAR.get('"')!.chords.right)).toBe('Shift (R + T + S + E), then A + Y + I');
  });

  it('keeps direct chords ahead of shifted ones', () => {
    expect(ITEM_BY_CHAR.get('(')!.id).toBe('brackets:(');
    expect(ITEM_BY_CHAR.get('?')!.id).toBe('symbols:?');
    expect(SHIFTED_ITEMS.map((i) => i.char).join('')).toBe(':"<>_+|~@#$%^&*');
  });

  it('uses ids without separator characters', () => {
    for (const i of SHIFTED_ITEMS) expect(i.id).toMatch(/^shift:[a-z]+$/);
  });

  it('describes chords', () => {
    expect(describeChord(ITEM_BY_ID.get('symbols:?')!.chords.right)).toBe('Hold E, then Y');
  });
});

describe('layout 0.9.0', () => {
  const r = (ch: string) => L090.byChar.get(ch)!.chords.right;
  const pos = (side: Side, item: Item) => item.chords[side].press.map((k) => GRID[side].indexOf(k)).sort();
  const at = (side: Side, base: string) => pos(side, L090.item(base)!);

  it('keeps every letter chord from 0.8.1', () => {
    for (const c of 'abcdefghijklmnopqrstuvwxyz') expect(L090.byChar.get(c)!.chords).toEqual(L081.byChar.get(c)!.chords);
  });

  it('matches the 0.9.0 diagram and firmware (right hand)', () => {
    expect(at('right', ',')).toEqual([0, 5]); // A + Y
    expect(at('right', '.')).toEqual([0, 6]); // A + I
    expect(at('right', "'")).toEqual([1, 5]); // R + Y
    expect(at('right', '?')).toEqual([3, 7]); // S + O
    expect(at('right', 'shiftlock')).toEqual([0, 5, 6, 7]); // A + Y + I + O
    expect(at('right', 'shift')).toEqual([1, 2, 3, 4]); // R + T + S + E
    expect(at('right', 'clear')).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(r('[')).toEqual({ press: ['t'], hold: 'a' });
    expect(r(')')).toEqual({ press: ['y'], hold: 'a' });
    expect(r('#')).toEqual({ press: ['a'], hold: 'e' });
    expect(r('@')).toEqual({ press: ['y'], hold: 'e' });
  });

  it('matches the 0.9.0 diagram (left hand, a mirror image)', () => {
    expect(at('left', ',')).toEqual([3, 6]); // A (top right) + Y
    expect(at('left', '?')).toEqual([0, 4]); // S (top left) + O
    expect(at('left', 'shiftlock')).toEqual([3, 4, 5, 6]);
    // Brackets are mirrored in 0.9.0, unlike 0.8.1.
    expect(L090.layers.find((l) => l.id === 'brackets')!.cells.left).toEqual(['{', '[', '(', HOLD, '}', ']', ')', null]);
  });

  it('has no duplicate base-layer chords', () => {
    const seen = new Map<string, string>();
    for (const item of L090.baseItems) {
      const s = [...item.chords.right.press].sort().join('');
      expect(seen.get(s), `${item.base} collides with ${seen.get(s)}`).toBeUndefined();
      seen.set(s, item.base);
    }
  });

  it('drops the 0.8.1-only combos and adds the new ones', () => {
    for (const gone of ['caps', 'clearbt', 'btselect']) expect(L090.item(gone)).toBeUndefined();
    expect(L090.layers.map((l) => l.id)).not.toContain('bt');
    expect(L090.item('ctrl')!.name).toBe('Ctrl (lock)');
    expect(L090.byChar.get('?')!.base).toBe('?');
  });

  it('uses direct keys for # and @, and Shift only for the rest', () => {
    expect(L090.byChar.get('#')!.base).toBe('symbols:#');
    expect(L090.shiftedItems.map((i) => i.char).join('')).toBe(':"<>_+|~$%^&*');
    expect(describeChord(L090.byChar.get('"')!.chords.right)).toBe('Shift (R + T + S + E), then R + Y');
  });

  it('has lessons whose items all exist and can be matched', () => {
    for (const l of L090.lessons) for (const id of l.items) expect(L090.byId.get(id)?.match, id).toBeDefined();
    expect(L090.lessons.find((l) => l.id === 'punct')!.items.map((id) => L090.byId.get(id)!.char)).toContain('?');
  });
});

describe('stats sharing between versions', () => {
  it('keeps every 0.8.1 id unchanged', () => {
    for (const i of L081.items) expect(i.id).toBe(i.base);
  });

  it('only shares an id when the chord is the same on both hands', () => {
    for (const i of L090.items) {
      const old = L081.byId.get(i.id);
      if (old) expect(i.chords, i.id).toEqual(old.chords);
    }
  });

  it('shares unchanged keys and separates changed ones', () => {
    for (const ch of ['a', 'z', ' ', '!', '/', '5', ';', '-', '=', ':']) {
      expect(L090.byChar.get(ch)!.id, ch).toBe(L081.byChar.get(ch)!.id);
    }
    expect(L090.byChar.get(',')!.id).toBe(',@0.9');
    expect(L090.byChar.get("'")!.id).toBe("'@0.9");
    expect(L090.byChar.get('[')!.id).toBe('brackets:[@0.9');
    // Same right-hand key, but a different left-hand key in 0.9.0.
    expect(L090.byChar.get('(')!.id).toBe('brackets:(@0.9');
    expect(L090.item('shiftlock')!.id).toBe('shiftlock@0.9');
  });
});
