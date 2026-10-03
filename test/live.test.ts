import { describe, expect, it } from 'vitest';
import { LiveTyping } from '../src/live';

const key = (key: string, code: string, mods: Partial<Record<'shiftKey' | 'ctrlKey' | 'altKey' | 'metaKey', boolean>> = {}) => ({
  key,
  code,
  shiftKey: false,
  ctrlKey: false,
  altKey: false,
  metaKey: false,
  repeat: false,
  ...mods,
});
const SHIFT = key('Shift', 'ShiftLeft', { shiftKey: true });

describe('LiveTyping', () => {
  it('merges a one-shot Ctrl into the next key', () => {
    const live = new LiveTyping('right');
    live.keydown(key('Control', 'ControlLeft', { ctrlKey: true }));
    expect(live.entries[0]).toMatchObject({ label: 'Ctrl', pending: 'ctrl', chord: { press: ['s', 'e'] } });
    live.keydown(key('h', 'KeyH', { ctrlKey: true }));
    expect(live.entries).toHaveLength(1);
    expect(live.entries[0]).toMatchObject({ label: 'Ctrl + h', chord: { press: ['e', 'i'] }, mods: [{ label: 'Ctrl', chord: { press: ['s', 'e'] } }] });
  });

  it('keeps an unmerged modifier when the next key lacks it', () => {
    const live = new LiveTyping('right');
    live.keydown(key('Alt', 'AltLeft', { altKey: true }));
    live.keydown(key('h', 'KeyH'));
    expect(live.entries.map((e) => e.label)).toEqual(['h', 'Alt']);
  });

  it('treats a Shift that arrives together with a key as one-shot', () => {
    const live = new LiveTyping('right');
    live.keydown(SHIFT);
    live.keydown(key('B', 'KeyB', { shiftKey: true }));
    expect(live.settle()).toBe(false);
    live.keyup({ key: 'Shift' });
    expect(live.entries).toHaveLength(1);
    expect(live.entries[0]).toMatchObject({ label: 'B', mods: [{ label: 'Shift', chord: { press: ['r', 't', 's', 'e'] } }] });
  });

  it('treats a Shift that stands alone as Shift lock, and shows it turning off', () => {
    const live = new LiveTyping('right');
    live.keydown(SHIFT);
    expect(live.entries[0].options).toHaveLength(2);
    expect(live.settle()).toBe(true);
    expect(live.entries[0]).toMatchObject({ label: '⇧ Lock', name: 'Shift lock on', chord: { press: ['r', 'y'] } });
    expect(live.entries[0].options).toBeUndefined();
    live.keydown(key('H', 'KeyH', { shiftKey: true }));
    live.keydown(key('I', 'KeyI', { shiftKey: true }));
    live.keyup({ key: 'Shift' });
    expect(live.entries.map((e) => e.name)).toEqual(['Shift lock off', 'Letter', 'Letter', 'Shift lock on']);
    expect(live.entries[1].mods).toEqual([{ label: '⇧ Lock', chord: { press: ['r', 'y'] } }]);
  });

  it('folds the Shift a symbol is sent with', () => {
    const live = new LiveTyping('right');
    live.keydown(SHIFT);
    live.keydown(key('!', 'Digit1', { shiftKey: true }));
    live.settle();
    live.keyup({ key: 'Shift' });
    expect(live.entries.map((e) => e.label)).toEqual(['!']);
    expect(live.entries[0].mods).toEqual([]);
  });

  it('does not treat the Shift inside a symbol as a modifier', () => {
    const live = new LiveTyping('right');
    live.keydown(key('(', 'Digit9', { shiftKey: true }));
    expect(live.entries[0]).toMatchObject({ label: '(', mods: [], chord: { press: ['r'], hold: 'a' } });
  });

  it('shows Cmd + key with both chords', () => {
    const live = new LiveTyping('right');
    live.keydown(key('Meta', 'MetaLeft', { metaKey: true }));
    live.keydown(key('z', 'KeyZ', { metaKey: true }));
    expect(live.entries[0]).toMatchObject({ label: 'Gui + z', mods: [{ label: 'Gui', chord: { press: ['s', 'y'] } }] });
  });
});
