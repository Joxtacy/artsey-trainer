// @vitest-environment jsdom
import { flushSync, mount, unmount } from 'svelte';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import Learn from '../src/components/Learn.svelte';
import Type from '../src/components/Type.svelte';
import { settings } from '../src/settings.svelte';

const press = (key: string, code: string, shiftKey = false) => {
  document.body.dispatchEvent(new KeyboardEvent('keydown', { key, code, shiftKey, bubbles: true, cancelable: true }));
  flushSync();
};
const typeLetter = (ch: string) => press(ch, `Key${ch.toUpperCase()}`);
const text = (sel: string) => document.querySelector(sel)?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let app: ReturnType<typeof mount> | undefined;
const render = (c: typeof Learn | typeof Type) => {
  app = mount(c, { target: document.body });
  flushSync();
};

beforeEach(() => {
  settings.stats = {};
  settings.confusions = {};
  settings.lesson = 'pairs';
  settings.hint = 'never';
  settings.side = 'right';
});
afterEach(() => {
  if (app) unmount(app);
  app = undefined;
  document.body.innerHTML = '';
});

/** A letter that is not the current target. */
const otherThan = (label: string) => (label.toLowerCase() === 'z' ? 'q' : 'z');

describe('Learn: confusions', () => {
  it('records a miss once per prompt, even if the same wrong key repeats', () => {
    render(Learn);
    const target = text('.glyph').toLowerCase();
    const wrong = otherThan(target);
    typeLetter(wrong);
    typeLetter(wrong);
    expect(settings.confusions).toEqual({ [target]: { [wrong]: 1 } });
  });

  it('enables "My confusions" only once there is a confusion', () => {
    render(Learn);
    const btn = () => [...document.querySelectorAll<HTMLButtonElement>('.lesson')].find((b) => b.textContent?.includes('My confusions'))!;
    expect(btn().disabled).toBe(true);
    typeLetter(otherThan(text('.glyph')));
    expect(btn().disabled).toBe(false);
    expect(btn().textContent).toContain('1 pair');
  });

  it('drills a confused pair back to back and lists it with both chords', async () => {
    settings.confusions = { b: { c: 3 } };
    settings.lesson = 'confusions';
    render(Learn);
    expect(text('.confusions')).toContain('C when you meant B ×3');
    expect(document.querySelectorAll('.crow .chord')).toHaveLength(2);

    const first = text('.glyph');
    expect(['B', 'C']).toContain(first);
    typeLetter(first.toLowerCase());
    await sleep(200);
    flushSync();
    expect(text('.glyph')).toBe(first === 'B' ? 'C' : 'B');
    // Typing B right removes one "C for B" mistake; typing C right leaves it.
    expect(text('.confusions')).toContain(`C when you meant B ×${first === 'B' ? 2 : 3}`);
  });

  it('shows "all clear" when the confusions are reset during the drill', () => {
    settings.confusions = { b: { c: 1 } };
    settings.lesson = 'confusions';
    render(Learn);
    const reset = document.querySelector<HTMLButtonElement>('.reset')!;
    reset.click();
    reset.click();
    flushSync();
    expect(settings.confusions).toEqual({});
    expect(text('.clear')).toContain('No confusions left');
    expect(document.querySelector('.target')).toBeNull();
  });

  it('removes one mistake for each first-try correct answer, then shows "all clear"', async () => {
    settings.confusions = { b: { c: 1 }, c: { b: 1 } };
    settings.lesson = 'confusions';
    render(Learn);
    const first = text('.glyph');
    typeLetter(first.toLowerCase());
    await sleep(200);
    flushSync();
    // One direction of the pair is cleared; the other key is still drilled.
    expect(settings.confusions).toEqual(first === 'B' ? { c: { b: 1 } } : { b: { c: 1 } });
    const second = text('.glyph');
    expect(second).toBe(first === 'B' ? 'C' : 'B');
    typeLetter(second.toLowerCase());
    await sleep(200);
    flushSync();
    expect(settings.confusions).toEqual({});
    expect(text('.clear')).toContain('No confusions left');
  });

  it('does not remove a mistake when the right key comes after a miss', () => {
    settings.confusions = { b: { c: 1 } };
    settings.lesson = 'confusions';
    render(Learn);
    // The drill shows B or C; typing B for C (or C for B) records the reverse confusion, then the right key.
    const target = text('.glyph').toLowerCase();
    const wrong = target === 'b' ? 'c' : 'b';
    typeLetter(wrong);
    const afterMiss = settings.confusions[target]?.[wrong];
    expect(afterMiss).toBeGreaterThan(0);
    typeLetter(target);
    expect(settings.confusions[target]?.[wrong]).toBe(afterMiss);
  });
});

describe('Type: confusions', () => {
  it('removes one mistake when the next character is typed right first time', () => {
    render(Type);
    const next = document.querySelector('.c.cur')!.textContent!;
    settings.confusions = { [next]: { z: 2 } };
    typeLetter(next);
    expect(settings.confusions).toEqual({ [next]: { z: 1 } });
  });

  it('records a miss against the next character, once per position', () => {
    render(Type);
    const next = document.querySelector('.c.cur')!.textContent!;
    const target = next === '·' ? 'space' : next;
    const wrong = otherThan(next);
    typeLetter(wrong);
    typeLetter(wrong);
    expect(settings.confusions).toEqual({ [target]: { [wrong]: 1 } });
  });
});
